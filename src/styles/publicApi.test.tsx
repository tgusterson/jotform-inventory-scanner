/// <reference types="node" />
import { readFileSync } from "node:fs";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { BarcodeScanner } from "../components/BarcodeScanner/BarcodeScanner";
import { DEFAULT_COLUMNS } from "../components/BarcodeScanner/columns";
import { PUBLIC_CLASSES, PUBLIC_TOKENS } from "./publicApi";

// Vitest stubs CSS imports (including ?raw) to empty strings, so read the file directly.
const tokensCss = readFileSync("src/styles/tokens.css", "utf8");

type ZxingOptions = {
  onDecodeResult: (result: { rawValue: string; boundingBox: object }) => void;
  onError: (error: unknown) => void;
};

const zxing = vi.hoisted(() => ({ options: undefined as unknown }));

vi.mock("react-zxing", () => ({
  useZxing: (options: unknown) => {
    zxing.options = options;
    return { ref: useRef<HTMLVideoElement>(null) };
  },
}));

vi.mock("../components/BarcodeScanner/isBoxInsideFrame", () => ({
  isBoxInsideFrame: () => true,
}));

function collectClasses(into: Set<string>) {
  document.querySelectorAll("[class]").forEach((element) => {
    element.classList.forEach((name) => into.add(name));
  });
}

describe("public styling contract", () => {
  it("renders every documented class", async () => {
    const user = userEvent.setup();
    const seen = new Set<string>();
    const longCode = "https://example.com/" + "a".repeat(60);

    render(<BarcodeScanner columns={DEFAULT_COLUMNS} />);

    // Empty state with the camera open.
    await user.click(screen.getByRole("button", { name: /Open camera/ }));
    collectClasses(seen);

    // A scanned row (the camera stays open briefly after a successful scan).
    act(() => {
      (zxing.options as ZxingOptions).onDecodeResult({
        rawValue: longCode,
        boundingBox: { x: 0, y: 0, width: 1, height: 1 },
      });
    });
    collectClasses(seen);

    // Error message state.
    act(() => {
      (zxing.options as ZxingOptions).onError(new Error("no camera"));
    });
    collectClasses(seen);

    const missing = PUBLIC_CLASSES.filter((name) => !seen.has(name));

    expect(missing).toEqual([]);
  });

  it("defines every documented token in tokens.css", () => {
    const missing = PUBLIC_TOKENS.filter(
      (name) => !new RegExp(`${name}\\s*:`).test(tokensCss),
    );

    expect(missing).toEqual([]);
  });
});
