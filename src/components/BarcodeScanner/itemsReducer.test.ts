import { afterEach, describe, expect, it, vi } from "vitest";
import { itemsReducer, toSubmissionRows } from "./itemsReducer";
import type { ItemsAction } from "./itemsReducer";
import type { ColumnConfig, ScannedItem } from "./types";

const columns: ColumnConfig[] = [
  { key: "job", label: "Job", type: "text" },
  { key: "qty", label: "Qty", type: "number", defaultValue: "1" },
];

function makeState(): ScannedItem[] {
  return [
    { id: "a", code: "AAA", values: { job: "j1", qty: "1" } },
    { id: "b", code: "BBB", values: { job: "j2", qty: "2" } },
  ];
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("itemsReducer", () => {
  describe("add", () => {
    it("uses column defaults, falling back to an empty string", () => {
      vi.spyOn(crypto, "randomUUID").mockReturnValue("00000000-0000-0000-0000-000000000001");

      const result = itemsReducer([], { type: "add", code: "XYZ", columns });

      expect(result).toEqual([
        {
          id: "00000000-0000-0000-0000-000000000001",
          code: "XYZ",
          values: { job: "", qty: "1" },
        },
      ]);
    });

    it("trims the code", () => {
      vi.spyOn(crypto, "randomUUID").mockReturnValue("00000000-0000-0000-0000-000000000002");

      const result = itemsReducer([], { type: "add", code: "  XYZ \n", columns });

      expect(result[0].code).toBe("XYZ");
    });

    it("ignores empty and whitespace-only codes", () => {
      const state = makeState();

      expect(itemsReducer(state, { type: "add", code: "", columns })).toBe(state);
      expect(itemsReducer(state, { type: "add", code: "   ", columns })).toBe(state);
    });
  });

  it("updateValue changes only the targeted row and key", () => {
    const result = itemsReducer(makeState(), {
      type: "updateValue",
      id: "a",
      key: "job",
      value: "new",
    });

    expect(result).toEqual([
      { id: "a", code: "AAA", values: { job: "new", qty: "1" } },
      { id: "b", code: "BBB", values: { job: "j2", qty: "2" } },
    ]);
  });

  it("delete removes only the targeted row", () => {
    const result = itemsReducer(makeState(), { type: "delete", id: "a" });

    expect(result.map((item) => item.id)).toEqual(["b"]);
  });

  it("clear empties the list", () => {
    expect(itemsReducer(makeState(), { type: "clear" })).toEqual([]);
  });

  it("never mutates the original state", () => {
    vi.spyOn(crypto, "randomUUID").mockReturnValue("00000000-0000-0000-0000-000000000003");

    const actions: ItemsAction[] = [
      { type: "add", code: "NEW", columns },
      { type: "updateValue", id: "a", key: "job", value: "changed" },
      { type: "delete", id: "a" },
      { type: "clear" },
    ];

    for (const action of actions) {
      const state = makeState();
      const frozen = structuredClone(state);

      itemsReducer(state, action);

      expect(state).toEqual(frozen);
    }
  });
});

describe("toSubmissionRows", () => {
  it("flattens values next to the code and excludes id", () => {
    const rows = toSubmissionRows(makeState());

    expect(rows).toEqual([
      { code: "AAA", job: "j1", qty: "1" },
      { code: "BBB", job: "j2", qty: "2" },
    ]);
    expect(rows[0]).not.toHaveProperty("id");
  });
});
