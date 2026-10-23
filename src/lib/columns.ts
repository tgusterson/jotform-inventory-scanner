import type { ColumnConfig } from "./types";

export const DEFAULT_COLUMNS: ColumnConfig[] = [
    { key: "jobNumber", label: "Job number", type: "text" },
    { key: "quantity", label: "Quantity", type: "number", defaultValue: "1" },
];