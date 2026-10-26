import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StrictMode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BarcodeScanner } from "./BarcodeScanner";
import { getJotform } from "../lib/jotform";
import type { ColumnConfig, WidgetConfig } from "../lib/types";

vi.mock("../lib/jotform", () => ({ getJotform: vi.fn() }));
vi.mock("../lib/debug", () => ({ log: vi.fn() }));
vi.mock("./CameraView", () => ({
  CameraView: ({
    onDecode,
    onError,
  }: {
    onDecode: (code: string) => void;
    onError: (message: string) => void;
  }) => (
    <div>
      <button onClick={() => onDecode("ABC-1")}>Fake scan</button>
      <button onClick={() => onError("No camera")}>Fake error</button>
    </div>
  ),
}));

const columns: ColumnConfig[] = [
  { key: "job_number", label: "Job number", type: "text" },
  { key: "qty", label: "Qty", type: "number" },
];
const config: WidgetConfig = { columns };

function createFakeJotform(withSendData = true) {
  let submitCallback: (() => void) | undefined;

  const api = {
    subscribe: vi.fn((event: string, callback: () => void) => {
      if (event === "submit") {
        submitCallback = callback;
      }
    }),
    getWidgetSetting: vi.fn(),
    sendSubmit: vi.fn(),
    requestFrameResize: vi.fn(),
    ...(withSendData ? { sendData: vi.fn() } : {}),
  };

  return { api, submit: () => submitCallback?.() };
}

async function scanOne(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: /Open camera/ }));
  await user.click(screen.getByRole("button", { name: "Fake scan" }));
}

describe("BarcodeScanner", () => {
  beforeEach(() => {
    vi.mocked(getJotform).mockReturnValue(undefined);
  });

  afterEach(() => {
    vi.mocked(getJotform).mockReset();
  });

  it("works standalone without Jotform", async () => {
    const user = userEvent.setup();

    render(<BarcodeScanner config={config} />);
    await scanOne(user);

    expect(screen.getByTitle("ABC-1")).toBeInTheDocument();
  });

  it("shows a camera error and closes the camera", async () => {
    const user = userEvent.setup();

    render(<BarcodeScanner config={config} />);
    await user.click(screen.getByRole("button", { name: /Open camera/ }));
    await user.click(screen.getByRole("button", { name: "Fake error" }));

    expect(screen.getByRole("alert")).toHaveTextContent("No camera");
    expect(
      screen.queryByRole("button", { name: "Fake scan" }),
    ).not.toBeInTheDocument();
  });

  it("restores rows from initialValue", () => {
    const initialValue = JSON.stringify([
      { Code: "RESTORED-1", "Job number": "J7", Qty: "3" },
    ]);

    render(<BarcodeScanner config={config} initialValue={initialValue} />);

    expect(screen.getByTitle("RESTORED-1")).toBeInTheDocument();
    expect(screen.getByLabelText(/Job number.*RESTORED-1/)).toHaveValue("J7");
    expect(screen.getByLabelText(/Qty.*RESTORED-1/)).toHaveValue("3");
  });

  describe("inside Jotform", () => {
    it("subscribes to submit exactly once under StrictMode", () => {
      const { api } = createFakeJotform();
      vi.mocked(getJotform).mockReturnValue(api);

      render(
        <StrictMode>
          <BarcodeScanner config={config} />
        </StrictMode>,
      );

      const submitSubscriptions = api.subscribe.mock.calls.filter(
        ([event]) => event === "submit",
      );

      expect(submitSubscriptions).toHaveLength(1);
    });

    it("submits the latest items without ids", async () => {
      const user = userEvent.setup();
      const { api, submit } = createFakeJotform();
      vi.mocked(getJotform).mockReturnValue(api);

      render(<BarcodeScanner config={config} />);
      await scanOne(user);
      await user.type(screen.getByLabelText(/Job number.*ABC-1/), "J9");

      act(() => submit());

      expect(api.sendSubmit).toHaveBeenCalledOnce();

      const message = api.sendSubmit.mock.calls[0][0];

      expect(message.valid).toBe(true);
      expect(JSON.parse(message.value)).toEqual([
        { Code: "ABC-1", "Job number": "J9", Qty: "" },
      ]);
      expect(message.value).not.toContain("id");
    });

    it("sends valid: false and shows every error when a rule fails", async () => {
      const user = userEvent.setup();
      const { api, submit } = createFakeJotform();
      vi.mocked(getJotform).mockReturnValue(api);
      const required: WidgetConfig = {
        columns: [{ key: "job_number", label: "Job number", type: "text", required: true }],
      };

      render(<BarcodeScanner config={required} />);
      await scanOne(user);

      expect(screen.queryByText("Job number is required")).not.toBeInTheDocument();

      act(() => submit());

      expect(api.sendSubmit.mock.calls[0][0].valid).toBe(false);
      expect(screen.getByText("Job number is required")).toBeInTheDocument();
    });

    it("validates the latest edits on submit (not stale values)", async () => {
      const user = userEvent.setup();
      const { api, submit } = createFakeJotform();
      vi.mocked(getJotform).mockReturnValue(api);
      const required: WidgetConfig = {
        columns: [{ key: "job_number", label: "Job number", type: "text", required: true }],
      };

      render(<BarcodeScanner config={required} />);
      await scanOne(user);
      await user.type(screen.getByLabelText(/Job number.*ABC-1/), "J9");

      act(() => submit());

      expect(api.sendSubmit.mock.calls[0][0].valid).toBe(true);
      expect(screen.queryByText("Job number is required")).not.toBeInTheDocument();
    });

    it("sends valid: false and alerts when submitting with no items", () => {
      const { api, submit } = createFakeJotform();
      vi.mocked(getJotform).mockReturnValue(api);

      render(<BarcodeScanner config={config} />);

      expect(screen.queryByText("Scan at least one item")).not.toBeInTheDocument();

      act(() => submit());

      expect(api.sendSubmit.mock.calls[0][0].valid).toBe(false);
      expect(screen.getByRole("alert")).toHaveTextContent("Scan at least one item");
    });

    it("requests a frame resize when errors appear after submit", async () => {
      const user = userEvent.setup();
      const { api, submit } = createFakeJotform();
      vi.mocked(getJotform).mockReturnValue(api);
      const required: WidgetConfig = {
        columns: [{ key: "job_number", label: "Job number", type: "text", required: true }],
      };

      render(<BarcodeScanner config={required} />);
      await scanOne(user);
      await vi.waitFor(() => expect(api.requestFrameResize).toHaveBeenCalled());
      api.requestFrameResize.mockClear();

      act(() => submit());

      await vi.waitFor(() => expect(api.requestFrameResize).toHaveBeenCalled());
    });

    it("syncs the value with sendData whenever items change", async () => {
      const user = userEvent.setup();
      const { api } = createFakeJotform();
      vi.mocked(getJotform).mockReturnValue(api);

      render(<BarcodeScanner config={config} />);

      expect(api.sendData).toHaveBeenLastCalledWith({ value: "" });

      await scanOne(user);

      const { value } = api.sendData!.mock.lastCall![0];

      expect(JSON.parse(value)).toEqual([
        { Code: "ABC-1", "Job number": "", Qty: "" },
      ]);

      await user.click(screen.getByRole("button", { name: /Clear/ }));

      expect(api.sendData).toHaveBeenLastCalledWith({ value: "" });
    });

    it("works when sendData is not available", async () => {
      const user = userEvent.setup();
      const { api } = createFakeJotform(false);
      vi.mocked(getJotform).mockReturnValue(api);

      render(<BarcodeScanner config={config} />);

      await expect(scanOne(user)).resolves.not.toThrow();
    });

    it("requests a frame resize when the number of items changes", async () => {
      const user = userEvent.setup();
      const { api } = createFakeJotform();
      vi.mocked(getJotform).mockReturnValue(api);

      render(<BarcodeScanner config={config} />);
      await scanOne(user);

      await vi.waitFor(() => {
        expect(api.requestFrameResize).toHaveBeenCalledWith({
          height: expect.any(Number),
        });
      });
    });
  });

  it("shows no validation errors before submit is pressed", async () => {
    const user = userEvent.setup();
    const required: WidgetConfig = {
      columns: [{ key: "job_number", label: "Job number", type: "text", required: true }],
    };

    render(<BarcodeScanner config={required} />);
    await scanOne(user);

    expect(screen.queryByText("Job number is required")).not.toBeInTheDocument();
    expect(screen.queryByText("Scan at least one item")).not.toBeInTheDocument();
  });

  it("tells the user to reload when settings failed to load", () => {
    render(
      <BarcodeScanner config={config} configErrors={["Settings did not load"]} settingsFailed />,
    );

    const alert = screen.getByRole("alert");

    expect(alert).toHaveTextContent("Settings did not load");
    expect(alert).toHaveTextContent("Reload the form to try again.");
    expect(alert).not.toHaveTextContent("Fix the Columns setting");
  });

  describe("when settings failed to load", () => {
    it("never overwrites the saved value with sendData", async () => {
      const user = userEvent.setup();
      const { api } = createFakeJotform();
      vi.mocked(getJotform).mockReturnValue(api);

      render(<BarcodeScanner config={config} settingsFailed />);
      await scanOne(user);

      expect(api.sendData).not.toHaveBeenCalled();
    });

    it("submits as not valid even when every rule passes", async () => {
      const user = userEvent.setup();
      const { api, submit } = createFakeJotform();
      vi.mocked(getJotform).mockReturnValue(api);

      render(<BarcodeScanner config={config} settingsFailed />);
      await scanOne(user);
      act(() => submit());

      expect(api.sendSubmit.mock.calls[0][0].valid).toBe(false);
    });
  });

  it("shows config errors in an alert above everything else", () => {
    render(<BarcodeScanner config={config} configErrors={["Column 2 is missing a label"]} />);

    const alert = screen.getByRole("alert");

    expect(alert).toHaveClass("bsit-config-errors");
    expect(alert).toHaveTextContent("This widget's settings have problems");
    expect(alert).toHaveTextContent("Column 2 is missing a label");
    expect(alert).toHaveTextContent("Fix the Columns setting in the form builder.");
    expect(alert.parentElement?.firstElementChild).toBe(alert);
  });

  it("does not request a frame resize outside Jotform", async () => {
    const user = userEvent.setup();
    const resize = vi.fn();

    window.JFCustomWidget = {
      subscribe: vi.fn(),
      getWidgetSetting: vi.fn(),
      sendSubmit: vi.fn(),
      requestFrameResize: resize,
    };

    render(<BarcodeScanner config={config} />);
    await scanOne(user);
    await new Promise((resolve) => requestAnimationFrame(resolve));

    expect(resize).not.toHaveBeenCalled();

    delete window.JFCustomWidget;
  });
});
