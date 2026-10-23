import type { ColumnConfig, ScannedItem } from "./types";

export type ItemsAction =
  | { type: "add"; code: string; columns: ColumnConfig[] }
  | { type: "updateValue"; id: string; key: string; value: string }
  | { type: "delete"; id: string }
  | { type: "clear" };

export function itemsReducer(
  state: ScannedItem[],
  action: ItemsAction,
): ScannedItem[] {
  switch (action.type) {
    case "add": {
      const code = action.code.trim();

      if (!code) {
        return state;
      }

      const values = Object.fromEntries(
        action.columns.map((column) => [column.key, column.defaultValue ?? ""]),
      );

      return [...state, { id: crypto.randomUUID(), code, values }];
    }

    case "updateValue":
      return state.map((item) =>
        item.id === action.id
          ? { ...item, values: { ...item.values, [action.key]: action.value } }
          : item,
      );

    case "delete":
      return state.filter((item) => item.id !== action.id);

    case "clear":
      return [];
  }
}

export function toSubmissionRows(items: ScannedItem[]) {
  return items.map(({ code, values }) => ({ code, ...values }));
}
