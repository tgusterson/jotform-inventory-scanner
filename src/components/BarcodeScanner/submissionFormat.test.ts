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

  it("produces a single-line table with no newlines", () => {
    const output = formatSubmission([item("A", "j", "1"), item("B")], columns);

    expect(output).not.toMatch(/[\r\n]/);
    expect(output.startsWith("<table><thead>")).toBe(true);
    expect(output.endsWith("</tbody></table>")).toBe(true);
  });

  it("orders headers and cells like the columns, with empty cells for empty values", () => {
    expect(formatSubmission([item("A", "j", "")], columns)).toBe(
      "<table><thead><tr><th>Code</th><th>Job number</th><th>Quantity</th></tr></thead>" +
        "<tbody><tr><td>A</td><td>j</td><td></td></tr></tbody></table>",
    );
  });

  it("escapes codes, values and labels", () => {
    const evil = `<script>alert(1)</script> & "x" 'y'`;
    const output = formatSubmission(
      [item(evil, evil)],
      [{ key: "job", label: "<b>Job</b>", type: "text" }],
    );

    expect(output).not.toContain("<script>");
    expect(output).not.toContain("<b>");
    expect(output).toContain("&lt;script&gt;alert(1)&lt;/script&gt; &amp; &quot;x&quot; &#39;y&#39;");
  });
});

describe("parseSubmission", () => {
  it("round-trips codes and values, including special characters", () => {
    const evil = `<script>alert(1)</script> & "x"`;
    const items = [
      item(evil, "J: 1", "3"),
      item("https://example.com:8080/a?b=c&d=e", "", ""),
    ];

    const { rows, unmatched } = parseSubmission(formatSubmission(items, columns), columns);

    expect(unmatched).toEqual([]);
    expect(rows).toEqual(items.map(({ code, values }) => ({ code, values })));
  });

  it("matches headers case-insensitively", () => {
    const html =
      "<table><thead><tr><th>Code</th><th>JOB NUMBER</th><th>quantity</th></tr></thead>" +
      "<tbody><tr><td>A</td><td>j</td><td>4</td></tr></tbody></table>";

    const { rows, unmatched } = parseSubmission(html, columns);

    expect(unmatched).toEqual([]);
    expect(rows).toEqual([{ code: "A", values: { job: "j", qty: "4" } }]);
  });

  it("reports unmatched headers once and ignores their cells", () => {
    const html =
      "<table><thead><tr><th>Code</th><th>Colour</th><th>Job number</th><th>Colour</th></tr></thead>" +
      "<tbody><tr><td>A</td><td>red</td><td>j</td><td>blue</td></tr></tbody></table>";

    const { rows, unmatched } = parseSubmission(html, columns);

    expect(unmatched).toEqual(["Colour"]);
    expect(rows).toEqual([{ code: "A", values: { job: "j", qty: "" } }]);
  });

  it("defaults configured columns missing from the table to an empty string", () => {
    const html =
      "<table><thead><tr><th>Code</th><th>Job number</th></tr></thead>" +
      "<tbody><tr><td>A</td><td>j</td></tr></tbody></table>";

    expect(parseSubmission(html, columns).rows).toEqual([
      { code: "A", values: { job: "j", qty: "" } },
    ]);
  });

  it("skips rows with an empty code", () => {
    const html =
      "<table><thead><tr><th>Code</th><th>Job number</th></tr></thead>" +
      "<tbody><tr><td> </td><td>j</td></tr></tbody></table>";

    expect(parseSubmission(html, columns).rows).toEqual([]);
  });

  it("returns no rows for non-table input", () => {
    expect(parseSubmission("", columns)).toEqual({ rows: [], unmatched: [] });
    expect(parseSubmission("1. A\n   Job number: j", columns)).toEqual({
      rows: [],
      unmatched: [],
    });
  });
});
