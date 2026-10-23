import { describe, expect, it } from "vitest";
import { validateItems, validateValue } from "./validation";
import type { ColumnConfig, ScannedItem, WidgetConfig } from "./types";

const text: ColumnConfig = { key: "notes", label: "Notes", type: "text" };
const qty: ColumnConfig = { key: "qty", label: "Quantity", type: "number" };

describe("validateValue", () => {
  it("requires a value after trimming", () => {
    const column = { ...text, required: true };

    expect(validateValue("", column)).toBe("Notes is required");
    expect(validateValue("   ", column)).toBe("Notes is required");
    expect(validateValue(" x ", column)).toBeNull();
  });

  it("skips other checks when empty and not required", () => {
    const column: ColumnConfig = { ...qty, min: 1, pattern: "\\d+" };

    expect(validateValue("", column)).toBeNull();
    expect(validateValue("  ", column)).toBeNull();
  });

  it.each([
    ["0", null],
    ["-1", null],
    ["1.5", null],
    [" 3 ", null],
    ["12abc", "Quantity must be a number"],
    ["abc", "Quantity must be a number"],
    ["Infinity", "Quantity must be a number"],
  ])("number %j -> %j", (value, expected) => {
    expect(validateValue(value, qty)).toBe(expected);
  });

  it("checks min and max", () => {
    const column: ColumnConfig = { ...qty, min: 1, max: 5 };

    expect(validateValue("0", column)).toBe("Quantity must be at least 1");
    expect(validateValue("1", column)).toBeNull();
    expect(validateValue("5", column)).toBeNull();
    expect(validateValue("6", column)).toBe("Quantity must be at most 5");
  });

  it("checks the pattern as a full match with a custom message", () => {
    const column: ColumnConfig = { ...text, pattern: "\\d{7}", message: "Seven digits" };

    expect(validateValue("1234567", column)).toBeNull();
    expect(validateValue("12345678", column)).toBe("Seven digits");
  });

  it("passes a value that matches the pattern", () => {
    expect(validateValue("ABC", { ...text, pattern: "[A-Z]+" })).toBeNull();
  });

  it("trims the value before matching the pattern", () => {
    expect(validateValue(" 123 ", { ...text, pattern: "\\d+" })).toBeNull();
  });

  it("applies the pattern to number columns after the numeric checks", () => {
    const column: ColumnConfig = { ...qty, min: 1, pattern: "\\d+" };

    expect(validateValue("0", column)).toBe("Quantity must be at least 1");
    expect(validateValue("1.5", column)).toBe("Quantity is not in the expected format");
    expect(validateValue("2", column)).toBeNull();
  });

  it("reports required before anything else for empty values", () => {
    const column: ColumnConfig = { ...qty, required: true, min: 1 };

    expect(validateValue("", column)).toBe("Quantity is required");
  });

  it("does not apply min/max to text columns", () => {
    expect(validateValue("abc", { ...text, min: 5 })).toBeNull();
  });

  it("applies max without min, and min without max", () => {
    expect(validateValue("11", { ...qty, max: 10 })).toBe("Quantity must be at most 10");
    expect(validateValue("-100", { ...qty, max: 10 })).toBeNull();
    expect(validateValue("-100", { ...qty, min: 0 })).toBe("Quantity must be at least 0");
    expect(validateValue("1e3", { ...qty, min: 0 })).toBeNull();
  });

  it("ignores a pattern that cannot be compiled instead of throwing", () => {
    expect(validateValue("x", { ...text, pattern: "(" })).toBeNull();
  });

  it("uses a default message when the pattern has none", () => {
    const column: ColumnConfig = { ...text, pattern: "[A-Z]+" };

    expect(validateValue("abc", column)).toBe("Notes is not in the expected format");
  });
});

describe("validateItems", () => {
  const config: WidgetConfig = {
    columns: [{ ...text, required: true }, { ...qty, min: 1 }],
  };
  const item = (id: string, values: Record<string, string>): ScannedItem => ({
    id,
    code: "CODE",
    values,
  });

  it("is invalid with no items", () => {
    expect(validateItems([], config)).toEqual({ valid: false, errors: {} });
  });

  it("is valid when every field passes", () => {
    const result = validateItems([item("a", { notes: "x", qty: "2" })], config);

    expect(result).toEqual({ valid: true, errors: {} });
  });

  it("collects errors per item and column", () => {
    const result = validateItems(
      [item("a", { notes: "", qty: "2" }), item("b", { notes: "x", qty: "0" }), item("c", { notes: "y", qty: "1" })],
      config,
    );

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual({
      a: { notes: "Notes is required" },
      b: { qty: "Quantity must be at least 1" },
    });
  });

  it("never validates the scanned code", () => {
    const result = validateItems(
      [{ id: "a", code: "", values: { notes: "", qty: "x" } }],
      config,
    );

    expect(Object.keys(result.errors.a)).toEqual(["notes", "qty"]);
    expect(result.errors.a).not.toHaveProperty("code");
  });
});
