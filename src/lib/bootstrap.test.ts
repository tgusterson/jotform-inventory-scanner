import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { bootstrap, getSavedValue, READY_TIMEOUT_MS } from "./bootstrap";
import { DEFAULT_COLUMNS } from "./columns";
import { getJotform } from "./jotform";

vi.mock("./jotform", () => ({ getJotform: vi.fn() }));
vi.mock("./debug", () => ({ log: vi.fn() }));

function createFakeJotform(setting?: string) {
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

    expect(render).toHaveBeenCalledExactlyOnceWith(DEFAULT_COLUMNS, "");
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

    const [columns, initialValue] = render.mock.calls[0];

    expect(columns.map((column: { label: string }) => column.label)).toEqual([
      "Job number",
      "Qty",
    ]);
    expect(initialValue).toBe("saved");
  });

  it("uses default columns when the setting is empty or missing", () => {
    const { api, fireReady } = createFakeJotform(undefined);
    vi.mocked(getJotform).mockReturnValue(api);
    const render = vi.fn();

    bootstrap(render);
    fireReady();

    expect(render).toHaveBeenCalledExactlyOnceWith(DEFAULT_COLUMNS, "");
  });

  it("falls back to defaults if ready never fires", () => {
    const { api } = createFakeJotform("Label");
    vi.mocked(getJotform).mockReturnValue(api);
    const render = vi.fn();

    bootstrap(render);
    vi.advanceTimersByTime(READY_TIMEOUT_MS - 1);

    expect(render).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);

    expect(render).toHaveBeenCalledExactlyOnceWith(DEFAULT_COLUMNS, "");
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
