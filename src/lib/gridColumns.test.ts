import { describe, expect, it } from "vitest";
import { DEFAULT_COLUMNS } from "./columns";
import { ACTION_TRACK, CODE_TRACK, WIDTH_TRACKS, buildGridColumns } from "./gridColumns";
import type { ColumnConfig } from "./types";

const text = (key: string, width?: ColumnConfig["width"]): ColumnConfig => ({
  key,
  label: key,
  type: "text",
  width,
});
const number = (key: string, width?: ColumnConfig["width"]): ColumnConfig => ({
  key,
  label: key,
  type: "number",
  width,
});

describe("buildGridColumns", () => {
  it("maps each width to its token and flex share", () => {
    expect(CODE_TRACK).toBe("minmax(var(--bsit-col-code), 1.2fr)");
    expect(WIDTH_TRACKS).toEqual({
      narrow: "minmax(var(--bsit-col-narrow), 0.6fr)",
      normal: "minmax(var(--bsit-col-normal), 1fr)",
      wide: "minmax(var(--bsit-col-wide), 2fr)",
    });
  });

  it("builds Code, Quantity (narrow) and Action for the default columns", () => {
    expect(buildGridColumns(DEFAULT_COLUMNS)).toBe(
      `${CODE_TRACK} ${WIDTH_TRACKS.narrow} ${ACTION_TRACK}`,
    );
  });

  it("defaults a text column without a width to normal", () => {
    expect(buildGridColumns([text("a")])).toBe(
      `${CODE_TRACK} ${WIDTH_TRACKS.normal} ${ACTION_TRACK}`,
    );
  });

  it("defaults a number column without a width to narrow", () => {
    expect(buildGridColumns([number("a")])).toBe(
      `${CODE_TRACK} ${WIDTH_TRACKS.narrow} ${ACTION_TRACK}`,
    );
  });

  it("lets an explicit width override the type default", () => {
    expect(buildGridColumns([text("a", "wide"), number("b", "wide"), text("c", "narrow")])).toBe(
      [CODE_TRACK, WIDTH_TRACKS.wide, WIDTH_TRACKS.wide, WIDTH_TRACKS.narrow, ACTION_TRACK].join(" "),
    );
  });

  it("keeps the setting order with mixed widths", () => {
    const result = buildGridColumns([text("a", "wide"), number("b"), text("c"), text("d", "narrow")]);

    expect(result).toBe(
      [
        CODE_TRACK,
        WIDTH_TRACKS.wide,
        WIDTH_TRACKS.narrow,
        WIDTH_TRACKS.normal,
        WIDTH_TRACKS.narrow,
        ACTION_TRACK,
      ].join(" "),
    );
  });

  it("returns just Code and Action with no columns", () => {
    expect(buildGridColumns([])).toBe(`${CODE_TRACK} ${ACTION_TRACK}`);
  });
});
