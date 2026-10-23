import { describe, expect, it } from "vitest";
import { DEFAULT_COLUMNS } from "./columns";
import { parseConfig } from "./parseConfig";

describe("parseConfig", () => {
  describe("already-parsed input from Jotform", () => {
    const columns = [
      { label: "Job number", required: true, pattern: "\\d+" },
      { label: "Qty", type: "number", default: 1, min: 1 },
    ];

    it("treats a parsed array the same as the equivalent JSON string", () => {
      expect(parseConfig(columns)).toEqual(parseConfig(JSON.stringify(columns)));
      expect(parseConfig(columns).errors).toEqual([]);
    });

    it("validates the columns of a parsed array", () => {
      const { config, errors } = parseConfig([{ label: "A" }, { type: "number" }]);

      expect(config.columns.map((column) => column.label)).toEqual(["A"]);
      expect(errors).toEqual(["Column 2 is missing a label"]);
    });

    it("rejects a parsed object", () => {
      const { config, errors } = parseConfig({ columns });

      expect(errors).toEqual([
        "Columns setting must be a JSON array",
        "Using the default columns.",
      ]);
      expect(config.columns).toEqual(DEFAULT_COLUMNS);
    });

    it("gives the defaults for undefined and null", () => {
      for (const input of [undefined, null]) {
        const { config, errors } = parseConfig(input);

        expect(errors).toEqual([]);
        expect(config.columns).toEqual(DEFAULT_COLUMNS);
      }
    });

    it("reports an unexpected format for numbers and booleans", () => {
      for (const input of [5, true]) {
        const { config, errors } = parseConfig(input);

        expect(errors).toEqual([
          "Columns setting has an unexpected format",
          "Using the default columns.",
        ]);
        expect(config.columns).toEqual(DEFAULT_COLUMNS);
      }
    });
  });

  it("returns defaults for blank text", () => {
    expect(parseConfig("")).toEqual({
      config: { columns: DEFAULT_COLUMNS },
      errors: [],
    });
    expect(parseConfig("  \n ").config.columns).toEqual(DEFAULT_COLUMNS);
  });

  it("still parses the line format", () => {
    const { config, errors } = parseConfig("Job number\nQty:number=1");

    expect(errors).toEqual([]);
    expect(config.columns).toEqual([
      { key: "job_number", label: "Job number", type: "text", defaultValue: undefined },
      { key: "qty", label: "Qty", type: "number", defaultValue: "1" },
    ]);
  });

  it("parses a JSON array", () => {
    const { config, errors } = parseConfig(
      JSON.stringify([
        { label: "Notes" },
        { label: "Quantity", type: "number", default: 1, min: 1, max: 9, required: true },
        { label: "Job number", pattern: "\\d+", message: "Digits only", default: "5" },
      ]),
    );

    expect(errors).toEqual([]);
    expect(config.columns).toEqual([
      { key: "notes", label: "Notes", type: "text" },
      {
        key: "quantity",
        label: "Quantity",
        type: "number",
        defaultValue: "1",
        min: 1,
        max: 9,
        required: true,
      },
      {
        key: "job_number",
        label: "Job number",
        type: "text",
        defaultValue: "5",
        pattern: "\\d+",
        message: "Digits only",
      },
    ]);
  });

  it("rejects the object form", () => {
    const { config, errors } = parseConfig('{ "columns": [{ "label": "Notes" }] }');

    expect(config.columns).toEqual(DEFAULT_COLUMNS);
    expect(errors[0]).toBe("Columns setting must be a JSON array");
  });

  it("gives duplicate labels unique keys", () => {
    const { config } = parseConfig('[{"label":"Notes"},{"label":"Notes"},{"label":"notes"}]');

    expect(config.columns.map((column) => column.key)).toEqual([
      "notes",
      "notes_2",
      "notes_3",
    ]);
  });

  it("reports invalid JSON and uses defaults", () => {
    const { config, errors } = parseConfig("[{ nope");

    expect(config.columns).toEqual(DEFAULT_COLUMNS);
    expect(errors[0]).toMatch(/^Columns setting is not valid JSON: .+/);
    expect(errors.join(" ")).toContain("default columns");
  });

  it("reports a missing label", () => {
    const { config, errors } = parseConfig('[{"label":"A"},{"type":"number"}]');

    expect(errors).toEqual(["Column 2 is missing a label"]);
    expect(config.columns.map((column) => column.label)).toEqual(["A"]);
  });

  it("reports and drops an invalid column pattern", () => {
    const { config, errors } = parseConfig('[{"label":"Job number","pattern":"("}]');

    expect(errors).toEqual([
      'Column "Job number": pattern is not a valid regular expression',
    ]);
    expect(config.columns[0].pattern).toBeUndefined();
  });

  it("reports min greater than max", () => {
    const { config, errors } = parseConfig(
      '[{"label":"Quantity","type":"number","min":5,"max":1}]',
    );

    expect(errors).toEqual(['Column "Quantity": min must be less than or equal to max']);
    expect(config.columns[0].min).toBeUndefined();
    expect(config.columns[0].max).toBeUndefined();
  });

  it("reports min/max on text columns", () => {
    const { errors } = parseConfig('[{"label":"Notes","min":1}]');

    expect(errors).toEqual(['Column "Notes": min/max only apply to number columns']);
  });

  it("warns about unknown properties", () => {
    const { config, errors } = parseConfig('[{"label":"Notes","colour":"red"}]');

    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('"colour"');
    expect(config.columns).toHaveLength(1);
  });

  it("reports an invalid type and keeps the column as text", () => {
    const { config, errors } = parseConfig('[{"label":"Notes","type":"date"}]');

    expect(errors).toHaveLength(1);
    expect(config.columns[0].type).toBe("text");
  });

  it("uses defaults when no valid columns remain", () => {
    const { config, errors } = parseConfig('[{"type":"number"}]');

    expect(config.columns).toEqual(DEFAULT_COLUMNS);
    expect(errors).toContain("Column 1 is missing a label");
    expect(errors.at(-1)).toContain("Using the default columns");
  });

  it("uses defaults for an empty array", () => {
    const { config, errors } = parseConfig("[]");

    expect(config.columns).toEqual(DEFAULT_COLUMNS);
    expect(errors).toHaveLength(1);
  });

  it("falls back to defaults when a line-format setting has no usable lines", () => {
    expect(parseConfig(":number\n=5").config.columns).toEqual(DEFAULT_COLUMNS);
  });

  it("does not report errors for a valid line format", () => {
    expect(parseConfig("Notes").errors).toEqual([]);
  });

  it("reports entries that are not objects", () => {
    const { config, errors } = parseConfig('[{"label":"A"}, "B", 3, null, [1]]');

    expect(errors).toEqual([
      "Column 2 must be an object",
      "Column 3 must be an object",
      "Column 4 must be an object",
      "Column 5 must be an object",
    ]);
    expect(config.columns.map((column) => column.label)).toEqual(["A"]);
  });

  it("treats a non-string or blank label as missing", () => {
    const { errors } = parseConfig('[{"label":5},{"label":"   "}]');

    expect(errors).toContain("Column 1 is missing a label");
    expect(errors).toContain("Column 2 is missing a label");
  });

  it.each([
    ['"required":"yes"', 'Column "A": required must be true or false'],
    ['"pattern":5', 'Column "A": pattern must be a string'],
    ['"message":5', 'Column "A": message must be a string'],
    ['"default":true', 'Column "A": default must be a string or a number'],
    ['"type":"number","min":"1"', 'Column "A": min must be a number'],
    ['"type":"number","max":null', 'Column "A": max must be a number'],
  ])("reports a wrongly typed field (%s)", (fields, expected) => {
    const { config, errors } = parseConfig(`[{"label":"A",${fields}}]`);

    expect(errors).toEqual([expected]);
    expect(config.columns).toHaveLength(1);
  });

  it("drops a wrongly typed field but keeps the other fields", () => {
    const { config } = parseConfig('[{"label":"A","required":"yes","message":"m"}]');

    expect(config.columns[0].required).toBeUndefined();
    expect(config.columns[0].message).toBe("m");
  });

  it("keeps min only, max only, and equal min/max on number columns", () => {
    const { config, errors } = parseConfig(
      JSON.stringify([
        { label: "A", type: "number", min: 0 },
        { label: "B", type: "number", max: 10 },
        { label: "C", type: "number", min: 3, max: 3 },
      ]),
    );

    expect(errors).toEqual([]);
    expect(config.columns.map(({ min, max }) => [min, max])).toEqual([
      [0, undefined],
      [undefined, 10],
      [3, 3],
    ]);
  });

  it("stores a numeric default as a string, including 0", () => {
    const { config } = parseConfig('[{"label":"A","type":"number","default":0}]');

    expect(config.columns[0].defaultValue).toBe("0");
  });

  it("uses a column's label, trimmed, and a key from the trimmed label", () => {
    const { config } = parseConfig('[{"label":"  Job number  "}]');

    expect(config.columns[0]).toMatchObject({ label: "Job number", key: "job_number" });
  });

  it("accepts leading whitespace before the JSON", () => {
    expect(parseConfig('  \n [{"label":"A"}]').config.columns).toHaveLength(1);
  });

  it("reports non-array JSON values starting with [ or { clearly", () => {
    expect(parseConfig("{}").errors[0]).toBe("Columns setting must be a JSON array");
    expect(parseConfig("{").errors[0]).toBe("Columns setting must be a JSON array");
  });

  it("reports every problem across columns, not just the first", () => {
    const { errors } = parseConfig(
      '[{"label":"A","pattern":"("},{"label":"B","type":"number","min":2,"max":1},{"x":1}]',
    );

    expect(errors).toHaveLength(3);
  });
});