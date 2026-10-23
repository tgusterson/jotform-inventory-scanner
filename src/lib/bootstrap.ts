import { DEFAULT_COLUMNS } from "./columns";
import { log } from "./debug";
import { getJotform } from "./jotform";
import { parseColumns } from "./parseColumns";
import type { ColumnConfig } from "./types";

export const READY_TIMEOUT_MS = 3000;

export function getSavedValue(data: unknown): string {
  if (typeof data === "object" && data !== null && "value" in data) {
    const { value } = data;

    return typeof value === "string" ? value : "";
  }

  return "";
}

/** Calls render exactly once, after Jotform is ready or immediately when standalone. */
export function bootstrap(
  renderApp: (columns: ColumnConfig[], initialValue: string) => void,
) {
  let hasRendered = false;

  function render(columns: ColumnConfig[], initialValue: string) {
    if (hasRendered) {
      return;
    }

    hasRendered = true;
    renderApp(columns, initialValue);
  }

  const jotform = getJotform();

  if (!jotform) {
    render(DEFAULT_COLUMNS, "");

    return;
  }

  jotform.subscribe("ready", (data?: unknown) => {
    log("ready data", data);

    const setting = jotform.getWidgetSetting("columns") ?? "";

    log("columns setting", setting);

    const columns = parseColumns(setting);

    render(
      columns.length > 0 ? columns : DEFAULT_COLUMNS,
      getSavedValue(data),
    );
  });

  // Fallback so the widget never stays blank if "ready" doesn't arrive.
  window.setTimeout(() => render(DEFAULT_COLUMNS, ""), READY_TIMEOUT_MS);
}
