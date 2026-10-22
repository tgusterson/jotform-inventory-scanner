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

  it("outputs a JSON array keyed by Code then the column labels, without id", () => {
    const parsed = JSON.parse(formatSubmission([item("A", "j", "1"), item("B")], columns));

    expect(parsed).toEqual([
      { Code: "A", "Job number": "j", Quantity: "1" },
      { Code: "B", "Job number": "", Quantity: "" },
    ]);
    expect(Object.keys(parsed[0])).toEqual(["Code", "Job number", "Quantity"]);
    expect(parsed[0]).not.toHaveProperty("id");
  });

  it("gives colliding and duplicate labels unique keys", () => {
    const clashing: ColumnConfig[] = [
      { key: "a", label: "code", type: "text" },
      { key: "b", label: "Notes", type: "text" },
      { key: "c", label: "notes", type: "text" },
    ];
    const items: ScannedItem[] = [
      { id: "1", code: "X", values: { a: "1", b: "2", c: "3" } },
    ];

    expect(JSON.parse(formatSubmission(items, clashing))).toEqual([
      { Code: "X", "code 2": "1", Notes: "2", "notes 2": "3" },
    ]);
  });
});
describe("parseSubmission", () => {
  it("round-trips quotes, colons, pipes and unicode", () => {
    const items = [
      item('He said "hi": a | b', "ünï — 日本語 😀", "1"),
      item("https://example.com:8080/x", "", ""),
    ];

    const { rows, unmatched } = parseSubmission(formatSubmission(items, columns), columns);

    expect(unmatched).toEqual([]);
    expect(rows).toEqual(items.map(({ code, values }) => ({ code, values })));
  });

  it("restores earlier submissions keyed by column key", () => {
    const legacy = [{ Code: "A", job: "j", qty: "2" }];
    const keyed: ColumnConfig[] = [
      { key: "job_number", label: "Job number", type: "text" },
      { key: "quantity_ex", label: "Quantity (ex)", type: "number" },
    ];
    const text = JSON.stringify([{ code: "A", job_number: "j", quantity_ex: 2 }]);

    expect(parseSubmission(text, keyed).rows).toEqual([
      { code: "A", values: { job_number: "j", quantity_ex: "2" } },
    ]);
    expect(parseSubmission(JSON.stringify(legacy), columns).unmatched).toEqual([]);
  });

  it("matches JSON labels case-insensitively and reports unmatched properties", () => {
    const text = JSON.stringify([{ CODE: "A", "JOB NUMBER": "j", Colour: "red" }]);
    const { rows, unmatched } = parseSubmission(text, columns);

    expect(unmatched).toEqual(["Colour"]);
    expect(rows).toEqual([{ code: "A", values: { job: "j", qty: "" } }]);
  });

  it("skips JSON entries without a code", () => {
    const text = JSON.stringify([{ "Job number": "j" }, { Code: "", Quantity: "1" }, "x"]);

    expect(parseSubmission(text, columns).rows).toEqual([]);
  });

  it("returns no rows for invalid JSON", () => {
    expect(parseSubmission("[{oops", columns)).toEqual({ rows: [], unmatched: [] });
  });

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