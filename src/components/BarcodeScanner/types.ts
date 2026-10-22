export type ColumnType = "text" | "number";

export type ColumnConfig = {
    key: string;
    label: string;
    type: ColumnType;
    defaultValue?: string;
};

export type ScannedItem = {
    id: string;
    code: string;
    values: Record<string, string>;
};