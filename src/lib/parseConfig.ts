import { uniqueKey } from "./columnKey";
import { DEFAULT_COLUMNS } from "./columns";
import { compilePattern } from "./pattern";
import { parseColumns } from "./parseColumns";
import type { ColumnConfig, WidgetConfig } from "./types";

const COLUMN_PROPERTIES = [
    "label",
    "type",
    "default",
    "required",
    "pattern",
    "message",
    "min",
    "max",
];
const INVALID_PATTERN = "pattern is not a valid regular expression";

type ParseResult = { config: WidgetConfig; errors: string[] };

function defaults(): WidgetConfig {
    return { columns: DEFAULT_COLUMNS };
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNumber(value: unknown): value is number {
    return typeof value === "number" && Number.isFinite(value);
}

export function parseConfig(text: string): ParseResult {
    const trimmed = text.trim();

    if (!trimmed) {
        return { config: defaults(), errors: [] };
    }

    if (trimmed[0] === "{") {
        return {
            config: defaults(),
            errors: [
                "Columns setting must be a JSON array",
                "Using the default columns.",
            ],
        };
    }

    if (trimmed[0] !== "[") {
        const columns = parseColumns(text);

        return {
            config: {
                columns: columns.length > 0 ? columns : DEFAULT_COLUMNS,
            },
            errors: [],
        };
    }

    let json: unknown;

    try {
        json = JSON.parse(trimmed);
    } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);

        return {
            config: defaults(),
            errors: [
                `Columns setting is not valid JSON: ${reason}`,
                "Using the default columns.",
            ],
        };
    }

    const errors: string[] = [];
    // A text starting with "[" that parses as JSON is always an array.
    const rawColumns = json as unknown[];

    const usedKeys = new Set<string>();
    const columns: ColumnConfig[] = [];

    rawColumns.forEach((raw, index) => {
        const column = parseColumn(raw, index + 1, usedKeys, errors);

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

function reportUnknown(
    object: Record<string, unknown>,
    known: string[],
    subject: string,
    errors: string[],
) {
    for (const name of Object.keys(object)) {
        if (!known.includes(name)) {
            errors.push(`${subject}: unknown property "${name}" was ignored`);
        }
    }
}

function parseColumn(
    raw: unknown,
    position: number,
    usedKeys: Set<string>,
    errors: string[],
): ColumnConfig | undefined {
    if (!isRecord(raw)) {
        errors.push(`Column ${position} must be an object`);

        return undefined;
    }

    const label = typeof raw.label === "string" ? raw.label.trim() : "";

    if (!label) {
        errors.push(`Column ${position} is missing a label`);

        return undefined;
    }

    const subject = `Column "${label}"`;
    const fail = (problem: string) => errors.push(`${subject}: ${problem}`);

    reportUnknown(raw, COLUMN_PROPERTIES, subject, errors);

    const column: ColumnConfig = {
        key: uniqueKey(label, usedKeys),
        label,
        type: "text",
    };

    if (raw.type !== undefined) {
        if (raw.type === "text" || raw.type === "number") {
            column.type = raw.type;
        } else {
            fail('type must be "text" or "number"');
        }
    }

    if (raw.default !== undefined) {
        if (typeof raw.default === "string" || isNumber(raw.default)) {
            column.defaultValue = String(raw.default);
        } else {
            fail("default must be a string or a number");
        }
    }

    if (raw.required !== undefined) {
        if (typeof raw.required === "boolean") {
            column.required = raw.required;
        } else {
            fail("required must be true or false");
        }
    }

    if (raw.pattern !== undefined) {
        if (typeof raw.pattern !== "string") {
            fail("pattern must be a string");
        } else if (compilePattern(raw.pattern) === null) {
            fail(INVALID_PATTERN);
        } else {
            column.pattern = raw.pattern;
        }
    }

    if (raw.message !== undefined) {
        if (typeof raw.message === "string") {
            column.message = raw.message;
        } else {
            fail("message must be a string");
        }
    }

    parseRange(raw, column, fail);

    return column;
}

function parseRange(
    raw: Record<string, unknown>,
    column: ColumnConfig,
    fail: (problem: string) => void,
) {
    let min: number | undefined;
    let max: number | undefined;

    for (const name of ["min", "max"] as const) {
        const value = raw[name];

        if (value === undefined) {
            continue;
        }

        if (!isNumber(value)) {
            fail(`${name} must be a number`);
        } else if (name === "min") {
            min = value;
        } else {
            max = value;
        }
    }

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
