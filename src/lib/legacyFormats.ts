import { findColumn } from "./findColumn";
import type { ColumnConfig, ParsedSubmission } from "./types";

// Parsers for formats used by earlier versions, so old submissions still restore.
// Delete this file once they no longer need to be supported.

const SEPARATOR = " | ";

// Line format used before the switch back to JSON.
export function parseLineSubmission(
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
export function parseHtmlSubmission(
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
