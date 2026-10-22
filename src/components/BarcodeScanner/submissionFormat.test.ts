import { describe, expect, it } from "vitest";
import { formatSubmission, parseSubmission } from "./submissionFormat";
import type { ColumnConfig, ScannedItem } from "./types";

const columns: ColumnConfig[] = [
  { key: "job", label: "Job number", type: "text" },
  { key: "qty", label: "Quantity", type: "number" },
];

function item(code: string, job = "", qty = ""): ScannedItem {
  return { id: code, code, values: { job, qty } };
}

describe("formatSubmission", () => {
  it("formats a single item", () => {
    expect(formatSubmission([item("ABC", "J1", "2")], columns)).toBe(
      "1. ABC\n   Job number: J1\n   Quantity: 2",
    );
  });

  it("separates multiple items with one blank line and numbers them", () => {
    expect(formatSubmission([item("A", "j", "1"), item("B", "k", "2")], columns)).toBe(
      "1. A\n   Job number: j\n   Quantity: 1\n\n2. B\n   Job number: k\n   Quantity: 2",
    );
  });

  it("returns an empty string for no items", () => {
    expect(formatSubmission([], columns)).toBe("");
  });

  it("still outputs a line for empty values", () => {
    const lines = formatSubmission([item("A")], columns).split("\n");

    expect(lines).toHaveLength(3);
    expect(lines[1]).toMatch(/^ {3}Job number:\s*$/);
    expect(lines[2]).toMatch(/^ {3}Quantity:\s*$/);
  });

  it("flattens line breaks in codes and values", () => {
    const output = formatSubmission([item("A\r\nB\nC\rD", "x\ny ", " z")], columns);

    expect(output).toBe("1. A B C D\n   Job number: x y\n   Quantity: z");
  });
});

describe("parseSubmission", () => {
  it("round-trips codes and values, including colons", () => {
    const items = [
      item("https://example.com:8080/path?a=b", "J: 1", "3"),
      item("Part: 42", "", ""),
    ];

    const { rows, unmatched } = parseSubmission(formatSubmission(items, columns), columns);

    expect(unmatched).toEqual([]);
    expect(rows).toEqual(items.map(({ code, values }) => ({ code, values })));
  });

  it("accepts \\r\\n line endings", () => {
    const text = "1. A\r\n   Job number: j\r\n   Quantity: 1\r\n\r\n2. B\r\n   Job number: k\r\n   Quantity: 2";

    expect(parseSubmission(text, columns).rows).toEqual([
      { code: "A", values: { job: "j", qty: "1" } },
      { code: "B", values: { job: "k", qty: "2" } },
    ]);
  });

  it("splits blocks on multiple blank lines and handles a trailing colon", () => {
    const text = "1. A\n   Job number:\n\n\n\n2. B\n   Quantity: 5";

    expect(parseSubmission(text, columns).rows).toEqual([
      { code: "A", values: { job: "", qty: "" } },
      { code: "B", values: { job: "", qty: "5" } },
    ]);
  });

  it("reports unmatched labels without adding them to the values", () => {
    const text = "1. A\n   Job number: j\n   Colour: red\n\n2. B\n   Colour: blue";
    const { rows, unmatched } = parseSubmission(text, columns);

    expect(unmatched).toEqual(["Colour"]);
    expect(rows[0].values).toEqual({ job: "j", qty: "" });
  });

  it("matches labels case-insensitively", () => {
    const { rows, unmatched } = parseSubmission("1. A\n   JOB NUMBER: j\n   quantity: 4", columns);

    expect(unmatched).toEqual([]);
    expect(rows[0].values).toEqual({ job: "j", qty: "4" });
  });

  it("ignores blocks without a code", () => {
    expect(parseSubmission("1. \n   Job number: j", columns).rows).toEqual([]);
    expect(parseSubmission("", columns)).toEqual({ rows: [], unmatched: [] });
  });
});
