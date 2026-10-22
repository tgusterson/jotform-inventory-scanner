import { log } from "./debug";
import type { ColumnConfig, ScannedItem } from "./types";

export type ParsedSubmission = {
    rows: { code: string; values: Record<string, string> }[];
    unmatched: string[];
};

const SEPARATOR = " | ";
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
// Line format used before the switch back to JSON.
function parseLineSubmission(
    text: string,
    columns: ColumnConfig[],
): ParsedSubmission {

    const rows: ParsedSubmission["rows"] = [];
    const unmatched: string[] = [];

    for (const line of text.split(/\r\n|\n/)) {
        if (line.trim() === "") {
            continue;
        }

        const [rawCode, ...parts] = line.split(SEPARATOR);
        const code = rawCode.trim();

        if (!code) {
            continue;
        }

        const values = Object.fromEntries(columns.map((column) => [column.key, ""]));

        for (const rawPart of parts) {
            const part = rawPart.trim();
            const separatorIndex = part.indexOf(": ");
            let label: string;
            let value: string;

            if (separatorIndex !== -1) {
                label = part.slice(0, separatorIndex);
                value = part.slice(separatorIndex + 2);
            } else if (part.endsWith(":")) {
                label = part.slice(0, -1);
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
function parseHtmlSubmission(
    text: string,
    columns: ColumnConfig[],
): ParsedSubmission {
    const rows: ParsedSubmission["rows"] = [];
    const unmatched: string[] = [];

    const table = new DOMParser()
        .parseFromString(text, "text/html")
        .querySelector("table");

    if (!table) {
        return { rows, unmatched };
    }

    const headerRow = table.querySelector("tr");
    const headers = Array.from(headerRow?.querySelectorAll("th") ?? []).map(
        (header) => (header.textContent ?? "").trim(),
    );

    // Index 0 is the code column; the rest map to configured columns.
    const columnForIndex = headers.map((header, index) => {
        if (index === 0) {
            return undefined;
        }

        const column = findColumn(columns, header);

        if (!column && !unmatched.includes(header)) {
            unmatched.push(header);
        }

        return column;
    });

    for (const tr of Array.from(table.querySelectorAll("tr"))) {
        const cells = Array.from(tr.querySelectorAll("td"));

        if (cells.length === 0) {
            continue;
        }

        const code = (cells[0].textContent ?? "").trim();

        if (!code) {
            continue;
        }

        const values = Object.fromEntries(columns.map((column) => [column.key, ""]));

        cells.forEach((cell, index) => {
            const column = columnForIndex[index];

            if (column) {
                values[column.key] = (cell.textContent ?? "").trim();
            }
        });

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
