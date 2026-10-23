import { describe, expect, it } from "vitest";
import { DEFAULT_COLUMNS } from "./columns";
import { parseConfig } from "./parseConfig";

const HINT = "Use one column per line, e.g. Quantity; number; default=1";
const DEFAULTS_NOTE = "Using the default columns.";

function parse(text: string) {
  const { config, errors } = parseConfig(text);

  return { columns: config.columns, errors };
}

describe("parseConfig: input types", () => {
  it("gives the defaults for blank text, undefined and null", () => {
    for (const input of ["", "  \n \r\n ", undefined, null]) {
      const { config, errors } = parseConfig(input);

      expect(errors).toEqual([]);
      expect(config.columns).toEqual(DEFAULT_COLUMNS);
    }
  });

  it("reports an unexpected format for any other type", () => {
    for (const input of [5, true, [{ label: "A" }], { label: "A" }]) {
      const { config, errors } = parseConfig(input);

      expect(errors).toEqual(["Columns setting has an unexpected format", DEFAULTS_NOTE]);
      expect(config.columns).toEqual(DEFAULT_COLUMNS);
    }
  });

  it("reports JSON-looking text and uses the defaults", () => {
    for (const text of [
      "[object Object]",
      "[object Object],[object Object]",
      '[{"label":"A"}]',
      '{"columns":[]}',
      "  [oops",
      "{",
    ]) {
      const { config, errors } = parseConfig(text);

      expect(errors).toEqual([HINT, DEFAULTS_NOTE]);
      expect(config.columns).toEqual(DEFAULT_COLUMNS);
    }
  });
});

describe("parseConfig: columns", () => {
  it("reads label-only lines as optional text columns", () => {
    expect(parse("Notes").columns).toEqual([{ key: "notes", label: "Notes", type: "text" }]);
  });

  it("ignores blank lines and handles CRLF", () => {
    const { columns, errors } = parse("\nFirst\r\n   \r\nSecond\r\n");

    expect(columns.map((column) => column.label)).toEqual(["First", "Second"]);
    expect(errors).toEqual([]);
  });

  it("reads the number, text and required flags", () => {
    const [a, b, c] = parse("A; number\nB; text\nC; required").columns;

    expect(a.type).toBe("number");
    expect(b.type).toBe("text");
    expect(c).toMatchObject({ type: "text", required: true });
    expect(a.required).toBeUndefined();
  });

  it("reads every option", () => {
    const { columns, errors } = parse(
      "Qty; number; required; default=5; min=1; max=10; pattern=\\d+; message=Whole numbers",
    );

    expect(errors).toEqual([]);
    expect(columns[0]).toEqual({
      key: "qty",
      label: "Qty",
      type: "number",
      required: true,
      defaultValue: "5",
      min: 1,
      max: 10,
      pattern: "\\d+",
      message: "Whole numbers",
    });
  });

  it("accepts decimals and negative numbers for min and max", () => {
    expect(parse("T; number; min=-2.5; max=0.5").columns[0]).toMatchObject({ min: -2.5, max: 0.5 });
  });

  it("accepts options in any order", () => {
    const a = parse("Q; min=1; default=2; required; number; max=3").columns[0];
    const b = parse("Q; number; required; default=2; min=1; max=3").columns[0];

    expect(a).toEqual(b);
  });

  it("ignores case in flag and option names but not in values", () => {
    const { columns, errors } = parse("Q; NUMBER; Required; DEFAULT=AbC; Min=1; MAX=9; Pattern=[A-Z]+; MESSAGE=Hi");

    expect(errors).toEqual([]);
    expect(columns[0]).toMatchObject({
      type: "number",
      required: true,
      defaultValue: "AbC",
      min: 1,
      max: 9,
      pattern: "[A-Z]+",
      message: "Hi",
    });
  });

  it("trims whitespace around the label and values", () => {
    expect(parse("  Job number  ;  default=  x  ;required").columns[0]).toMatchObject({
      label: "Job number",
      defaultValue: "x",
      required: true,
    });
  });

  it("keeps ';' and '=' inside a pattern", () => {
    const { columns, errors } = parse("Ref; pattern=[a-z]+;[0-9]=x; required");

    expect(errors).toEqual([]);
    expect(columns[0].pattern).toBe("[a-z]+;[0-9]=x");
    expect(columns[0].required).toBe(true);
  });

  it("keeps ';' inside a message, including before words that are not options", () => {
    const { columns, errors } = parse("Ref; message=Use letters; then digits; required");

    expect(errors).toEqual([]);
    expect(columns[0].message).toBe("Use letters; then digits");
    expect(columns[0].required).toBe(true);
  });

  it("uses single backslashes in patterns as written", () => {
    const { columns, errors } = parse("Job number; pattern=[A-Za-z]{2}\\d{7}");

    expect(errors).toEqual([]);
    expect(columns[0].pattern).toBe("[A-Za-z]{2}\\d{7}");
  });

  it("treats empty default, pattern and message values as not set", () => {
    const { columns, errors } = parse("A; default=; pattern=; message=");

    expect(errors).toEqual([]);
    expect(columns[0]).toEqual({ key: "a", label: "A", type: "text" });
  });

  it("generates unique keys for duplicate labels", () => {
    expect(parse("Notes\nNotes\nNotes").columns.map((column) => column.key)).toEqual([
      "notes",
      "notes_2",
      "notes_3",
    ]);
  });

  it("builds keys from the label and falls back for symbol-only labels", () => {
    expect(parse("  Part # / Ref  ").columns[0].key).toBe("part_ref");
    expect(parse("###").columns[0].key).toBe("column");
  });

  it("parses the README example", () => {
    const { columns, errors } = parse(
      [
        "Job number; required; pattern=[A-Za-z]{2}\\d{7}; message=2 letters then 7 digits",
        "Quantity; number; required; default=1; min=1; max=999",
        "Notes",
      ].join("\n"),
    );

    expect(errors).toEqual([]);
    expect(columns.map((column) => column.key)).toEqual(["job_number", "quantity", "notes"]);
    expect(columns[0].message).toBe("2 letters then 7 digits");
    expect(columns[1]).toMatchObject({ min: 1, max: 999, defaultValue: "1" });
  });
});

describe("parseConfig: old Label:number=1 syntax", () => {
  it("still reads type and default", () => {
    expect(parse("Quantity:number=1").columns[0]).toEqual({
      key: "quantity",
      label: "Quantity",
      type: "number",
      defaultValue: "1",
    });
  });

  it("reads a type without a default, case-insensitively", () => {
    const [a, b] = parse("Qty:number\nCount:NUMBER").columns;

    expect(a.type).toBe("number");
    expect(b.type).toBe("number");
    expect(a.defaultValue).toBeUndefined();
  });

  it("reads a default without a type, and ignores unknown types", () => {
    expect(parse("Status=abc").columns[0]).toMatchObject({ type: "text", defaultValue: "abc" });
    expect(parse("Qty:foo").columns[0].type).toBe("text");
  });

  it("treats an empty default as none", () => {
    expect(parse("Status=").columns[0].defaultValue).toBeUndefined();
  });

  it("can be mixed with semicolon lines", () => {
    const { columns, errors } = parse("Qty:number=2\nNotes; required");

    expect(errors).toEqual([]);
    expect(columns.map((column) => column.type)).toEqual(["number", "text"]);
    expect(columns[1].required).toBe(true);
  });
});

describe("parseConfig: errors", () => {
  it("reports a missing label with the line number and skips the line", () => {
    const { columns, errors } = parse("A\n\n; required\n:number\nB");

    expect(columns.map((column) => column.label)).toEqual(["A", "B"]);
    expect(errors).toEqual(["Line 3 is missing a label", "Line 4 is missing a label"]);
  });

  it("reports an unknown option and keeps the column", () => {
    const { columns, errors } = parse("Qty; number; colour=red");

    expect(columns[0]).toMatchObject({ label: "Qty", type: "number" });
    expect(errors).toEqual(['Line 1 (Qty): unknown option "colour=red"']);
  });

  it("reports a misspelt flag", () => {
    const { columns, errors } = parse("Notes; requried");

    expect(columns[0].label).toBe("Notes");
    expect(columns[0].required).toBeUndefined();
    expect(errors).toEqual(['Line 1 (Notes): unknown option "requried"']);
  });

  it("reports unknown text after a flag", () => {
    const { columns, errors } = parse("Notes; required; oops");

    expect(columns[0].required).toBe(true);
    expect(errors).toEqual(['Line 1 (Notes): unknown option "oops"']);
  });

  it("uses the line number in the file, counting blank lines", () => {
    expect(parse("A\n\nB; min=x").errors).toEqual(["Line 3 (B): min must be a number"]);
  });

  it("reports min and max that are not numbers and drops them", () => {
    const { columns, errors } = parse("A; number; min=abc; max=");

    expect(errors).toEqual([
      "Line 1 (A): min must be a number",
      "Line 1 (A): max must be a number",
    ]);
    expect(columns[0].min).toBeUndefined();
    expect(columns[0].max).toBeUndefined();
  });

  it("rejects partial and non-finite numbers", () => {
    expect(parse("A; number; min=12abc").errors).toEqual(["Line 1 (A): min must be a number"]);
    expect(parse("A; number; max=Infinity").errors).toEqual(["Line 1 (A): max must be a number"]);
  });

  it("keeps a valid bound when the other is not a number", () => {
    const { columns } = parse("A; number; min=1; max=x");

    expect(columns[0].min).toBe(1);
    expect(columns[0].max).toBeUndefined();
  });

  it("reports min greater than max and drops both", () => {
    const { columns, errors } = parse("Quantity; number; min=5; max=1");

    expect(errors).toEqual(["Line 1 (Quantity): min must be less than or equal to max"]);
    expect(columns[0].min).toBeUndefined();
    expect(columns[0].max).toBeUndefined();
  });

  it("allows min equal to max", () => {
    expect(parse("Q; number; min=2; max=2").errors).toEqual([]);
  });

  it("reports min/max on a text column and drops them", () => {
    const { columns, errors } = parse("Notes; min=1; max=2");

    expect(errors).toEqual(["Line 1 (Notes): min/max only apply to number columns"]);
    expect(columns[0].min).toBeUndefined();
    expect(columns[0].max).toBeUndefined();
  });

  it("reports an invalid regex and drops only the pattern", () => {
    const { columns, errors } = parse("Job number; required; pattern=[unclosed; message=Nope");

    expect(errors).toEqual(["Line 1 (Job number): pattern is not a valid regular expression"]);
    expect(columns[0]).toMatchObject({ required: true, message: "Nope" });
    expect(columns[0].pattern).toBeUndefined();
  });

  it("reports an option set more than once and keeps the last value", () => {
    const { columns, errors } = parse("Qty; number; min=1; min=2; default=a; default=b");

    expect(columns[0]).toMatchObject({ min: 2, defaultValue: "b" });
    expect(errors).toEqual([
      "Line 1 (Qty): min is set more than once",
      "Line 1 (Qty): default is set more than once",
    ]);
  });

  it("reports duplicates regardless of the case of the option name", () => {
    expect(parse("Q; message=a; MESSAGE=b").errors).toEqual([
      "Line 1 (Q): message is set more than once",
    ]);
  });

  it("reports every problem on a line and still builds the column", () => {
    const { columns, errors } = parse("Q; bogus; number; min=9; max=1; pattern=(");

    expect(errors).toHaveLength(3);
    expect(columns[0]).toMatchObject({ label: "Q", type: "number" });
  });

  it("uses the defaults when no valid column remains", () => {
    const { config, errors } = parseConfig("; required\n:number");

    expect(errors).toEqual([
      "Line 1 is missing a label",
      "Line 2 is missing a label",
      "No valid columns found. Using the default columns.",
    ]);
    expect(config.columns).toEqual(DEFAULT_COLUMNS);
  });
});
