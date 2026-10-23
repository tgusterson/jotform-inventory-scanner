import type { ColumnConfig, ColumnWidth } from "./types";

export const CODE_TRACK = "minmax(var(--bsit-col-code), 1.2fr)";
export const ACTION_TRACK = "auto";

// Single source of truth for the width names; tokens.css defines the --bsit-col-* minimums.
export const WIDTH_TRACKS: Record<ColumnWidth, string> = {
    narrow: "minmax(var(--bsit-col-narrow), 0.6fr)",
    normal: "minmax(var(--bsit-col-normal), 1fr)",
    wide: "minmax(var(--bsit-col-wide), 2fr)",
};

export function defaultWidth(column: ColumnConfig): ColumnWidth {
    return column.type === "number" ? "narrow" : "normal";
}

// Returns a grid-template-columns value: Code, one track per column, Action.
export function buildGridColumns(columns: ColumnConfig[]): string {
    return [
        CODE_TRACK,
        ...columns.map((column) => WIDTH_TRACKS[column.width ?? defaultWidth(column)]),
        ACTION_TRACK,
    ].join(" ");
}
