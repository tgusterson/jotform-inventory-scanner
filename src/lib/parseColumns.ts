import { uniqueKey } from "./columnKey";
import type { ColumnConfig, ColumnType } from "./types";

export function parseColumns(text: string): ColumnConfig[] {
    const columns: ColumnConfig[] = [];
    const usedKeys = new Set<string>();

    for (const rawLine of text.split(/\r?\n/)) {
        const line = rawLine.trim();

        if (!line) {
            continue;
        }

        const [definition, rawDefault] = splitOnce(line, "=");
        const [rawLabel, rawType] = splitOnce(definition, ":");
        const label = rawLabel.trim();

        if (!label) {
            continue;
        }

        const type: ColumnType =
            rawType?.trim().toLowerCase() === "number" ? "number" : "text";

        const key = uniqueKey(label, usedKeys);
        const defaultValue = rawDefault?.trim();

        columns.push({
            key,
            label,
            type,
            defaultValue: defaultValue || undefined,
        });
    }

    return columns;
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
