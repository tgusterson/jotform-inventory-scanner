import { afterEach, describe, expect, it, vi } from "vitest";
import { getJotform } from "./jotform";

const widget = {
  subscribe: vi.fn(),
  getWidgetSetting: vi.fn(),
  sendSubmit: vi.fn(),
  requestFrameResize: vi.fn(),
};

function setSelf(value: unknown) {
  Object.defineProperty(window, "self", { value, configurable: true });
}

describe("getJotform", () => {
  const originalSelf = Object.getOwnPropertyDescriptor(window, "self");

  afterEach(() => {
    if (originalSelf) {
      Object.defineProperty(window, "self", originalSelf);
    }

    delete window.JFCustomWidget;
  });

  it("returns undefined when not in an iframe", () => {
    window.JFCustomWidget = widget;

    expect(getJotform()).toBeUndefined();
  });

  it("returns the API when in an iframe", () => {
    window.JFCustomWidget = widget;
    setSelf({});

    expect(getJotform()).toBe(widget);
  });

  it("treats a cross-origin error as being in an iframe", () => {
    window.JFCustomWidget = widget;
    Object.defineProperty(window, "self", {
      get() {
        throw new DOMException("Blocked", "SecurityError");
      },
      configurable: true,
    });

    expect(getJotform()).toBe(widget);
  });

  it("returns undefined in an iframe when the API is not loaded", () => {
    setSelf({});

    expect(getJotform()).toBeUndefined();
  });
});
