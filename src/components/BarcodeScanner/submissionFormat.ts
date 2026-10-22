import type { ColumnConfig, ScannedItem } from "./types";

export type ParsedSubmission = {
    rows: { code: string; values: Record<string, string> }[];
    unmatched: string[];
};

function flatten(text: string): string {
    return text.replace(/\r\n|\n|\r/g, " ").trim();
}

export function formatSubmission(
    items: ScannedItem[],
    columns: ColumnConfig[],
): string {
    return items
        .map((item, index) => {
            const lines = [`${index + 1}. ${flatten(item.code)}`];

            for (const column of columns) {
                lines.push(
                    `   ${column.label}: ${flatten(item.values[column.key] ?? "")}`,
                );
            }

            return lines.join("\n");
        })
        .join("\n\n");
}

export function parseSubmission(
    text: string,
    columns: ColumnConfig[],
): ParsedSubmission {
    const rows: ParsedSubmission["rows"] = [];
    const unmatched: string[] = [];

    const blocks: string[][] = [];
    let current: string[] = [];

    for (const line of text.split(/\r\n|\n|\r/)) {
        if (line.trim() === "") {
            if (current.length > 0) {
                blocks.push(current);
                current = [];
            }
        } else {
            current.push(line);
        }
    }

    if (current.length > 0) {
        blocks.push(current);
    }

    for (const [firstLine, ...rest] of blocks) {
        const code = firstLine.trim().replace(/^\d+\.\s*/, "").trim();

        if (!code) {
            continue;
        }

        const values = Object.fromEntries(columns.map((column) => [column.key, ""]));

        for (const rawLine of rest) {
            const line = rawLine.trim();
            const separatorIndex = line.indexOf(": ");
            let label: string;
            let value: string;

            if (separatorIndex !== -1) {
                label = line.slice(0, separatorIndex);
                value = line.slice(separatorIndex + 2);
            } else if (line.endsWith(":")) {
                label = line.slice(0, -1);
                value = "";
            } else {
                continue;
            }

            label = label.trim();

            const column = findColumn(columns, label);

            if (column) {
                values[column.key] = value.trim();
            } else if (!unmatched.includes(label)) {
                unmatched.push(label);
            }
        }

        rows.push({ code, values });
    }

    return { rows, unmatched };
}

function findColumn(
    columns: ColumnConfig[],
    label: string,
): ColumnConfig | undefined {
    const lowerLabel = label.toLowerCase();

    return (
        columns.find((column) => column.label === label) ??
        columns.find((column) => column.label.toLowerCase() === lowerLabel)
    );
}
