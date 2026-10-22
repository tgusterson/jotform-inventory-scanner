import { describe, expect, it } from "vitest";
import { parseColumns } from "./parseColumns";

describe("parseColumns", () => {
  it("parses a plain label as a text column", () => {
    expect(parseColumns("Notes")).toEqual([
      { key: "notes", label: "Notes", type: "text", defaultValue: undefined },
    ]);
  });

  it("parses :number as a number column, case-insensitively", () => {
    const columns = parseColumns("Qty:number\nCount:NUMBER");

    expect(columns.map((column) => column.type)).toEqual(["number", "number"]);
  });

  it("treats unknown types as text", () => {
    expect(parseColumns("Qty:foo")[0].type).toBe("text");
  });

  it("parses a default value after :number=", () => {
    expect(parseColumns("Quantity:number=1")[0]).toMatchObject({
      type: "number",
      defaultValue: "1",
    });
  });

  it("parses Label=default as a text column with a default", () => {
    expect(parseColumns("Status=abc")[0]).toMatchObject({
      type: "text",
      defaultValue: "abc",
    });
  });

  it("turns an empty default into undefined", () => {
    expect(parseColumns("Status=")[0].defaultValue).toBeUndefined();
  });

  it("ignores blank lines and lines with an empty label", () => {
    const columns = parseColumns("\nFirst\n   \n:number\n=5\nSecond\n");

    expect(columns.map((column) => column.label)).toEqual(["First", "Second"]);
  });

  it("generates keys from labels", () => {
    expect(parseColumns("Job number")[0].key).toBe("job_number");
    expect(parseColumns("  Part # / Ref  ")[0].key).toBe("part_ref");
  });

  it("falls back to 'column' when the label has no alphanumerics", () => {
    expect(parseColumns("###")[0].key).toBe("column");
  });

  it("makes duplicate keys unique", () => {
    const columns = parseColumns("Notes\nNotes\nNotes");

    expect(columns.map((column) => column.key)).toEqual(["notes", "notes_2", "notes_3"]);
  });

  it("handles Windows line endings", () => {
    const columns = parseColumns("Job number\r\nQuantity:number=1\r\n");

    expect(columns).toHaveLength(2);
    expect(columns[0].label).toBe("Job number");
    expect(columns[1]).toMatchObject({ label: "Quantity", type: "number", defaultValue: "1" });
  });
});
