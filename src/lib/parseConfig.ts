import { uniqueKey } from "./columnKey";
import { DEFAULT_COLUMNS } from "./columns";
import { compilePattern } from "./pattern";
import type { ColumnConfig, ColumnWidth, WidgetConfig } from "./types";

type ParseResult = { config: WidgetConfig; errors: string[] };

type OptionName = "default" | "min" | "max" | "pattern" | "message" | "width";

const FORMAT_HINT = "Use one column per line, e.g. Quantity; number; default=1";

// Split at ";" only when a known flag or option follows, so patterns and
// messages can contain ";".
const PART_SEPARATOR =
    /;\s*(?=(?:number|text|required)\s*(?:;|$)|(?:default|min|max|pattern|message|width)\s*=)/i;
const FLAG = /^(number|text|required)\s*(?:;\s*(.*))?$/is;
const OPTION = /^(default|min|max|pattern|message|width)\s*=(.*)$/is;
const WIDTHS: readonly string[] = ["narrow", "normal", "wide"];

function defaults(): WidgetConfig {
    return { columns: DEFAULT_COLUMNS };
}

function withDefaults(...errors: string[]): ParseResult {
    return {
        config: defaults(),
        errors: [...errors, "Using the default columns."],
    };
}

// Jotform may hand over a non-string value; only text is a valid setting.
export function parseConfig(input: unknown): ParseResult {
    if (input === undefined || input === null) {
        return { config: defaults(), errors: [] };
    }

    if (typeof input !== "string") {
        return withDefaults("Columns setting has an unexpected format");
    }

    const text = input.trim();

    if (!text) {
        return { config: defaults(), errors: [] };
    }

    // Includes "[object Object]", which Jotform produces for JSON-looking text.
    if (text[0] === "[" || text[0] === "{") {
        return withDefaults(FORMAT_HINT);
    }

    const errors: string[] = [];
    const usedKeys = new Set<string>();
    const columns: ColumnConfig[] = [];

    input.split(/\r?\n/).forEach((rawLine, index) => {
        const line = rawLine.trim();

        if (!line) {
            return;
        }

        const column = parseLine(line, index + 1, usedKeys, errors);

        if (column) {
            columns.push(column);
        }
    });

    if (columns.length === 0) {
        errors.push("No valid columns found. Using the default columns.");

        return { config: defaults(), errors };
    }

    return { config: { columns }, errors };
}

type RawLine = {
    label: string;
    type: "text" | "number";
    required: boolean;
    options: Partial<Record<OptionName, string>>;
    problems: string[];
};

function parseLine(
    line: string,
    lineNumber: number,
    usedKeys: Set<string>,
    errors: string[],
): ColumnConfig | undefined {
    const raw = line.includes(";") ? parseParts(line) : parseOldSyntax(line);

    if (!raw.label) {
        errors.push(`Line ${lineNumber} is missing a label`);

        return undefined;
    }

    const subject = `Line ${lineNumber} (${raw.label})`;
    const fail = (problem: string) => errors.push(`${subject}: ${problem}`);

    raw.problems.forEach(fail);

    const column: ColumnConfig = {
        key: uniqueKey(raw.label, usedKeys),
        label: raw.label,
        type: raw.type,
    };

    if (raw.required) {
        column.required = true;
    }

    const { options } = raw;

    if (options.default) {
        column.defaultValue = options.default;
    }

    if (options.message) {
        column.message = options.message;
    }

    if (options.pattern) {
        if (compilePattern(options.pattern) === null) {
            fail("pattern is not a valid regular expression");
        } else {
            column.pattern = options.pattern;
        }
    }

    applyRange(options, column, fail);

    if (options.width !== undefined) {
        const width = options.width.toLowerCase();

        if (WIDTHS.includes(width)) {
            column.width = width as ColumnWidth;
        } else {
            fail("width must be narrow, normal or wide");
        }
    }

    return column;
}

function parseOldSyntax(line: string): RawLine {
    const [definition, rawDefault] = splitOnce(line, "=");
    const [rawLabel, rawType] = splitOnce(definition, ":");
    const defaultValue = rawDefault?.trim();

    return {
        label: rawLabel.trim(),
        type: rawType?.trim().toLowerCase() === "number" ? "number" : "text",
        required: false,
        options: defaultValue ? { default: defaultValue } : {},
        problems: [],
    };
}

function parseParts(line: string): RawLine {
    const [first, ...rest] = line.split(PART_SEPARATOR);
    const raw: RawLine = {
        label: first.trim(),
        type: "text",
        required: false,
        options: {},
        problems: [],
    };

    // A ";" left in the label means the text after it is not a known option.
    const stray = raw.label.indexOf(";");

    if (stray !== -1) {
        raw.problems.push(unknownOption(raw.label.slice(stray + 1)));
        raw.label = raw.label.slice(0, stray).trim();
    }

    for (const part of rest) {
        const trimmed = part.trim();
        const flag = FLAG.exec(trimmed);
        const option = OPTION.exec(trimmed);

        if (flag) {
            const name = flag[1].toLowerCase();

            if (name === "required") {
                raw.required = true;
            } else {
                raw.type = name as "text" | "number";
            }

            if (flag[2]?.trim()) {
                raw.problems.push(unknownOption(flag[2]));
            }
        } else if (option) {
            const name = option[1].toLowerCase() as OptionName;

            if (name in raw.options) {
                raw.problems.push(`${name} is set more than once`);
            }

            raw.options[name] = option[2].trim();
        } else {
            raw.problems.push(unknownOption(trimmed));
        }
    }

    return raw;
}

function unknownOption(text: string) {
    return `unknown option "${text.trim()}"`;
}

function applyRange(
    options: RawLine["options"],
    column: ColumnConfig,
    fail: (problem: string) => void,
) {
    const values: { min?: number; max?: number } = {};

    for (const name of ["min", "max"] as const) {
        const text = options[name];

        if (text === undefined) {
            continue;
        }

        const value = text === "" ? Number.NaN : Number(text);

        if (Number.isFinite(value)) {
            values[name] = value;
        } else {
            fail(`${name} must be a number`);
        }
    }

    const { min, max } = values;

    if (min === undefined && max === undefined) {
        return;
    }

    if (column.type !== "number") {
        fail("min/max only apply to number columns");

        return;
    }

    if (min !== undefined && max !== undefined && min > max) {
        fail("min must be less than or equal to max");

        return;
    }

    if (min !== undefined) {
        column.min = min;
    }

    if (max !== undefined) {
        column.max = max;
    }
}

function splitOnce(
    value: string,
    separator: string,
): [string, string | undefined] {
    const index = value.indexOf(separator);

    return index === -1
        ? [value, undefined]
        : [value.slice(0, index), value.slice(index + 1)];
}
