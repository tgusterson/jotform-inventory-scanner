import { afterEach, describe, expect, it, vi } from "vitest";
import { isDebugEnabled, log } from "./debug";

describe("debug logging", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    window.history.replaceState(null, "", "/");
  });

  it("is on in dev builds", () => {
    vi.stubEnv("DEV", true);

    expect(isDebugEnabled()).toBe(true);
  });

  it("is off in production builds", () => {
    vi.stubEnv("DEV", false);

    expect(isDebugEnabled()).toBe(false);
  });

  it("can be switched on in production with ?debug", () => {
    vi.stubEnv("DEV", false);
    window.history.replaceState(null, "", "/?debug");

    expect(isDebugEnabled()).toBe(true);
  });

  it("ignores other query parameters", () => {
    vi.stubEnv("DEV", false);
    window.history.replaceState(null, "", "/?foo=1");

    expect(isDebugEnabled()).toBe(false);
  });

  it("logs with a prefix only when enabled", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});

    vi.stubEnv("DEV", false);
    log("hidden");
    expect(spy).not.toHaveBeenCalled();

    vi.stubEnv("DEV", true);
    log("shown", 1);
    expect(spy).toHaveBeenCalledExactlyOnceWith("[bsit]", "shown", 1);
  });
});
