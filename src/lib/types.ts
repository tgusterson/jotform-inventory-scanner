export type ColumnType = "text" | "number";

export type ColumnWidth = "narrow" | "normal" | "wide";

export type ColumnConfig = {
    key: string;
    label: string;
    type: ColumnType;
    defaultValue?: string;
    required?: boolean;
    pattern?: string;
    message?: string;
    min?: number;
    max?: number;
    width?: ColumnWidth;
};

export type WidgetConfig = {
    columns: ColumnConfig[];
};

export type ScannedItem = {
    id: string;
    code: string;
    values: Record<string, string>;
};
export type ParsedSubmission = {
    rows: { code: string; values: Record<string, string> }[];
    unmatched: string[];
};