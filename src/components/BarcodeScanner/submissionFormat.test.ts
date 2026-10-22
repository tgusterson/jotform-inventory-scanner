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
  it("returns an empty string for no items", () => {
    expect(formatSubmission([], columns)).toBe("");
  });

  it("writes one line per item in column order", () => {
    expect(formatSubmission([item("A", "j", "1"), item("B", "k", "2")], columns)).toBe(
      "A | Job number: j | Quantity: 1\nB | Job number: k | Quantity: 2",
    );
  });

  it("keeps empty values as 'Label: '", () => {
    expect(formatSubmission([item("A")], columns)).toBe("A | Job number:  | Quantity: ");
  });

  it("keeps colons in URLs and values", () => {
    expect(formatSubmission([item("https://example.com:8080/a", "J: 1")], columns)).toBe(
      "https://example.com:8080/a | Job number: J: 1 | Quantity: ",
    );
  });

  it("sanitises separators and line breaks", () => {
    const output = formatSubmission([item("A | B\r\nC", "x | y\nz ", " q")], columns);

    expect(output).toBe("A / B C | Job number: x / y z | Quantity: q");
    expect(output).not.toMatch(/[\r\n]/);
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

  it("accepts \\r\\n line endings and ignores blank lines", () => {
    const text = "A | Job number: j | Quantity: 1\r\n\r\nB | Job number: k | Quantity: 2\r\n";

    expect(parseSubmission(text, columns).rows).toEqual([
      { code: "A", values: { job: "j", qty: "1" } },
      { code: "B", values: { job: "k", qty: "2" } },
    ]);
  });

  it("handles a trailing colon with no value", () => {
    expect(parseSubmission("A | Job number: | Quantity:", columns).rows).toEqual([
      { code: "A", values: { job: "", qty: "" } },
    ]);
  });

  it("reports unmatched labels once and ignores their values", () => {
    const text = "A | Colour: red | Job number: j\nB | Colour: blue";
    const { rows, unmatched } = parseSubmission(text, columns);

    expect(unmatched).toEqual(["Colour"]);
    expect(rows[0].values).toEqual({ job: "j", qty: "" });
  });

  it("matches labels case-insensitively", () => {
    const { rows, unmatched } = parseSubmission("A | JOB NUMBER: j | quantity: 4", columns);

    expect(unmatched).toEqual([]);
    expect(rows[0].values).toEqual({ job: "j", qty: "4" });
  });

  it("defaults missing columns to an empty string", () => {
    expect(parseSubmission("A | Job number: j", columns).rows).toEqual([
      { code: "A", values: { job: "j", qty: "" } },
    ]);
  });

  it("skips lines with an empty code", () => {
    expect(parseSubmission(" | Job number: j", columns).rows).toEqual([]);
    expect(parseSubmission("", columns)).toEqual({ rows: [], unmatched: [] });
  });

  it("still parses a legacy HTML table", () => {
    const html =
      "<table><thead><tr><th>Code</th><th>Job number</th><th>Colour</th></tr></thead>" +
      "<tbody><tr><td>A &amp; B</td><td>j</td><td>red</td></tr></tbody></table>";

    expect(parseSubmission(html, columns)).toEqual({
      rows: [{ code: "A & B", values: { job: "j", qty: "" } }],
      unmatched: ["Colour"],
    });
  });
});