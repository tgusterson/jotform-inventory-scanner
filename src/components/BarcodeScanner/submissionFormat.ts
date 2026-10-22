import type { ColumnConfig, ScannedItem } from "./types";

export type ParsedSubmission = {
    rows: { code: string; values: Record<string, string> }[];
    unmatched: string[];
};

const HTML_ESCAPES: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
};

function escapeHtml(text: string): string {
    return text.replace(/[&<>"']/g, (character) => HTML_ESCAPES[character]);
}

export function formatSubmission(
    items: ScannedItem[],
    columns: ColumnConfig[],
): string {
    if (items.length === 0) {
        return "";
    }

    const headerCells = ["Code", ...columns.map((column) => column.label)]
        .map((label) => `<th>${escapeHtml(label)}</th>`)
        .join("");

    const bodyRows = items
        .map((item) => {
            const cells = [
                item.code,
                ...columns.map((column) => item.values[column.key] ?? ""),
            ]
                .map((text) => `<td>${escapeHtml(text)}</td>`)
                .join("");

            return `<tr>${cells}</tr>`;
        })
        .join("");

    return `<table><thead><tr>${headerCells}</tr></thead><tbody>${bodyRows}</tbody></table>`;
}

export function parseSubmission(
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
