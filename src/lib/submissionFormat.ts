import { log } from "./debug";
import { findColumn } from "./findColumn";
import { parseHtmlSubmission, parseLineSubmission } from "./legacyFormats";
import type { ColumnConfig, ParsedSubmission, ScannedItem } from "./types";

const CODE_HEADER = "Code";

// Jotform uses the object keys as table headers, so they must be unique.
function uniqueHeaders(labels: string[]): string[] {
    const used = new Set<string>();

    return labels.map((label) => {
        let header = label;
        let suffix = 2;

        while (used.has(header.toLowerCase())) {
            header = `${label} ${suffix++}`;
        }

        used.add(header.toLowerCase());

        return header;
    });
}

// Jotform renders a JSON array of objects as a table in notification emails.
export function formatSubmission(
    items: ScannedItem[],
    columns: ColumnConfig[],
): string {
    if (items.length === 0) {
        return "";
    }

    const [codeHeader, ...columnHeaders] = uniqueHeaders([
        CODE_HEADER,
        ...columns.map((column) => column.label),
    ]);

    return JSON.stringify(
        items.map((item) => ({
            [codeHeader]: item.code,
            ...Object.fromEntries(
                columns.map((column, index) => [
                    columnHeaders[index],
                    item.values[column.key] ?? "",
                ]),
            ),
        })),
    );
}

export function parseSubmission(
    text: string,
    columns: ColumnConfig[],
): ParsedSubmission {
    const trimmed = text.trim();

    if (trimmed.startsWith("[")) {
        return parseJsonSubmission(trimmed, columns);
    }

    // Submissions made during the HTML table experiment.
    if (trimmed.startsWith("<table")) {
        return parseHtmlSubmission(text, columns);
    }

    return parseLineSubmission(text, columns);
}

function parseJsonSubmission(
    text: string,
    columns: ColumnConfig[],
): ParsedSubmission {
    const rows: ParsedSubmission["rows"] = [];
    const unmatched: string[] = [];

    let data: unknown;

    try {
        data = JSON.parse(text);
    } catch (error) {
        log("parse error", error);
        return { rows, unmatched };
    }

    if (!Array.isArray(data)) {
        return { rows, unmatched };
    }

    for (const entry of data) {
        if (typeof entry !== "object" || entry === null || Array.isArray(entry)) {
            continue;
        }

        const properties = Object.entries(entry as Record<string, unknown>);
        const codeProperty = properties.find(
            ([name]) => name.toLowerCase() === CODE_HEADER.toLowerCase(),
        );
        const code = codeProperty ? String(codeProperty[1] ?? "").trim() : "";

        if (!code) {
            continue;
        }

        const values = Object.fromEntries(columns.map((column) => [column.key, ""]));

        for (const [name, value] of properties) {
            if (name === codeProperty?.[0]) {
                continue;
            }

            // Earlier submissions were keyed by column key rather than label.
            const column =
                findColumn(columns, name) ??
                columns.find((candidate) => candidate.key === name);

            if (column) {
                values[column.key] = String(value ?? "").trim();
            } else if (!unmatched.includes(name)) {
                unmatched.push(name);
            }
        }

        rows.push({ code, values });
    }

    return { rows, unmatched };
}
