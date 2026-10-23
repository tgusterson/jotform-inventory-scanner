import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { bootstrap, getSavedValue, READY_TIMEOUT_MS } from "./bootstrap";
import { DEFAULT_COLUMNS } from "./columns";
import { getJotform } from "./jotform";
import type { WidgetConfig } from "./types";

const DEFAULT_CONFIG: WidgetConfig = { columns: DEFAULT_COLUMNS };

vi.mock("./jotform", () => ({ getJotform: vi.fn() }));
vi.mock("./debug", () => ({ log: vi.fn() }));

function createFakeJotform(setting?: unknown) {
  let readyCallback: ((data?: unknown) => void) | undefined;

  return {
    api: {
      subscribe: vi.fn((event: string, callback: (data?: unknown) => void) => {
        if (event === "ready") {
          readyCallback = callback;
        }
      }),
      getWidgetSetting: vi.fn(() => setting),
      sendSubmit: vi.fn(),
      requestFrameResize: vi.fn(),
    },
    fireReady: (data?: unknown) => readyCallback?.(data),
  };
}

describe("getSavedValue", () => {
  it("reads a string value", () => {
    expect(getSavedValue({ value: "abc" })).toBe("abc");
  });

  it("returns an empty string for anything else", () => {
    expect(getSavedValue(undefined)).toBe("");
    expect(getSavedValue(null)).toBe("");
    expect(getSavedValue("text")).toBe("");
    expect(getSavedValue({})).toBe("");
    expect(getSavedValue({ value: 5 })).toBe("");
  });
});

describe("bootstrap", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.mocked(getJotform).mockReset();
  });

  it("renders immediately with default columns outside Jotform", () => {
    vi.mocked(getJotform).mockReturnValue(undefined);
    const render = vi.fn();

    bootstrap(render);

    expect(render).toHaveBeenCalledExactlyOnceWith(DEFAULT_CONFIG, [], "");
  });

  it("renders on ready with parsed columns and the saved value", () => {
    const { api, fireReady } = createFakeJotform("Job number\nQty:number=1");
    vi.mocked(getJotform).mockReturnValue(api);
    const render = vi.fn();

    bootstrap(render);

    expect(render).not.toHaveBeenCalled();

    fireReady({ value: "saved" });

    expect(api.getWidgetSetting).toHaveBeenCalledWith("columns");
    expect(render).toHaveBeenCalledOnce();

    const [config, errors, initialValue] = render.mock.calls[0];

    expect(errors).toEqual([]);
    expect(config.columns.map((column: { label: string }) => column.label)).toEqual([
      "Job number",
      "Qty",
    ]);
    expect(initialValue).toBe("saved");
  });

  it("passes config errors to render and keeps working with the valid columns", () => {
    const { api, fireReady } = createFakeJotform("A\n; required\nB; number; min=x");
    vi.mocked(getJotform).mockReturnValue(api);
    const render = vi.fn();

    bootstrap(render);
    fireReady();

    const [config, errors] = render.mock.calls[0];

    expect(config.columns.map((column: { label: string }) => column.label)).toEqual(["A", "B"]);
    expect(errors).toEqual(["Line 2 is missing a label", "Line 3 (B): min must be a number"]);
  });

  it("reports a non-string setting and falls back to the default columns", () => {
    const { api, fireReady } = createFakeJotform([{ label: "A" }]);
    vi.mocked(getJotform).mockReturnValue(api);
    const render = vi.fn();

    bootstrap(render);
    fireReady();

    const [config, errors] = render.mock.calls[0];

    expect(config).toEqual(DEFAULT_CONFIG);
    expect(errors[0]).toBe("Columns setting has an unexpected format");
  });

  it("reports JSON-looking text such as Jotform's [object Object]", () => {
    const { api, fireReady } = createFakeJotform("[object Object]");
    vi.mocked(getJotform).mockReturnValue(api);
    const render = vi.fn();

    bootstrap(render);
    fireReady();

    const [config, errors] = render.mock.calls[0];

    expect(config).toEqual(DEFAULT_CONFIG);
    expect(errors[0]).toMatch(/^Use one column per line/);
  });

  it("uses default columns when the setting is empty or missing", () => {
    const { api, fireReady } = createFakeJotform(undefined);
    vi.mocked(getJotform).mockReturnValue(api);
    const render = vi.fn();

    bootstrap(render);
    fireReady();

    expect(render).toHaveBeenCalledExactlyOnceWith(DEFAULT_CONFIG, [], "");
  });

  it("falls back to defaults if ready never fires", () => {
    const { api } = createFakeJotform("Label");
    vi.mocked(getJotform).mockReturnValue(api);
    const render = vi.fn();

    bootstrap(render);
    vi.advanceTimersByTime(READY_TIMEOUT_MS - 1);

    expect(render).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);

    expect(render).toHaveBeenCalledExactlyOnceWith(DEFAULT_CONFIG, [], "");
  });

  it("renders only once if ready fires before the fallback", () => {
    const { api, fireReady } = createFakeJotform("Label");
    vi.mocked(getJotform).mockReturnValue(api);
    const render = vi.fn();

    bootstrap(render);
    fireReady({ value: "x" });
    vi.advanceTimersByTime(READY_TIMEOUT_MS);

    expect(render).toHaveBeenCalledOnce();
  });

  it("ignores a late ready after the fallback rendered", () => {
    const { api, fireReady } = createFakeJotform("Label");
    vi.mocked(getJotform).mockReturnValue(api);
    const render = vi.fn();

    bootstrap(render);
    vi.advanceTimersByTime(READY_TIMEOUT_MS);
    fireReady({ value: "x" });

    expect(render).toHaveBeenCalledOnce();
  });
});
