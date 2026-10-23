import type { ColumnConfig } from "./types";

export const DEFAULT_COLUMNS: ColumnConfig[] = [
    { key: "quantity", label: "Quantity", type: "number", defaultValue: "1", min: 1 },
];
