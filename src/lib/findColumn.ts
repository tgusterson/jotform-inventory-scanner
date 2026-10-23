import type { ColumnConfig } from "./types";

export function findColumn(
    columns: ColumnConfig[],
    label: string,
): ColumnConfig | undefined {
    const lowerLabel = label.toLowerCase();

    return (
        columns.find((column) => column.label === label) ??
        columns.find((column) => column.label.toLowerCase() === lowerLabel)
    );
}
