import { describe, expect, it } from "vitest";
import { compilePattern } from "./pattern";

describe("compilePattern", () => {
  it("matches the whole value only", () => {
    const pattern = compilePattern("\\d{7}");

    expect(pattern?.test("1234567")).toBe(true);
    expect(pattern?.test("12345678")).toBe(false);
    expect(pattern?.test("a1234567")).toBe(false);
  });

  it("works with or without ^ and $", () => {
    expect(compilePattern("^[A-Za-z]{2}\\d{7}$")?.test("AB1234567")).toBe(true);
    expect(compilePattern("[A-Za-z]{2}\\d{7}")?.test("AB1234567")).toBe(true);
    expect(compilePattern("^\\d+")?.test("123")).toBe(true);
    expect(compilePattern("\\d+$")?.test("123")).toBe(true);
  });

  it("keeps alternation inside the full match", () => {
    const pattern = compilePattern("a|b");

    expect(pattern?.test("a")).toBe(true);
    expect(pattern?.test("ab")).toBe(false);
  });

  it("returns null for an invalid pattern", () => {
    expect(compilePattern("(")).toBeNull();
    expect(compilePattern("[a-")).toBeNull();
  });
});
