import { compilePattern } from "./pattern";
import type { ColumnConfig, ScannedItem, WidgetConfig } from "./types";

export type ItemErrors = Record<string, Record<string, string>>;

export type ValidationResult = {
    valid: boolean;
    errors: ItemErrors;
};

// Compiled once per pattern so typing doesn't recompile on every keystroke.
const patternCache = new Map<string, RegExp | null>();

function getPattern(pattern: string): RegExp | null {
    if (!patternCache.has(pattern)) {
        patternCache.set(pattern, compilePattern(pattern));
    }

    return patternCache.get(pattern) ?? null;
}

export function validateValue(value: string, column: ColumnConfig): string | null {
    const trimmed = value.trim();

    if (!trimmed) {
        return column.required ? `${column.label} is required` : null;
    }

    if (column.type === "number") {
        const number = Number(trimmed);

        if (!Number.isFinite(number)) {
            return `${column.label} must be a number`;
        }

        if (column.min !== undefined && number < column.min) {
            return `${column.label} must be at least ${column.min}`;
        }

        if (column.max !== undefined && number > column.max) {
            return `${column.label} must be at most ${column.max}`;
        }
    }

    if (column.pattern !== undefined) {
        const regex = getPattern(column.pattern);

        if (regex && !regex.test(trimmed)) {
            return column.message ?? `${column.label} is not in the expected format`;
        }
    }

    return null;
}

/** Validates configured columns only; the scanned code is never validated. */
export function validateItems(
    items: ScannedItem[],
    config: WidgetConfig,
): ValidationResult {
    const errors: ItemErrors = {};

    for (const item of items) {
        for (const column of config.columns) {
            const message = validateValue(item.values[column.key] ?? "", column);

            if (message) {
                (errors[item.id] ??= {})[column.key] = message;
            }
        }
    }

    return {
        valid: items.length > 0 && Object.keys(errors).length === 0,
        errors,
    };
}
