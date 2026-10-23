import { DEFAULT_COLUMNS } from "./columns";
import { log } from "./debug";
import { getJotform } from "./jotform";
import { parseConfig } from "./parseConfig";
import type { WidgetConfig } from "./types";

export const READY_TIMEOUT_MS = 3000;

const DEFAULT_CONFIG: WidgetConfig = { columns: DEFAULT_COLUMNS };

export function getSavedValue(data: unknown): string {
  if (typeof data === "object" && data !== null && "value" in data) {
    const { value } = data;

    return typeof value === "string" ? value : "";
  }

  return "";
}

/** Calls render exactly once, after Jotform is ready or immediately when standalone. */
export function bootstrap(
  renderApp: (
    config: WidgetConfig,
    configErrors: string[],
    initialValue: string,
  ) => void,
) {
  let hasRendered = false;

  function render(
    config: WidgetConfig,
    configErrors: string[],
    initialValue: string,
  ) {
    if (hasRendered) {
      return;
    }

    hasRendered = true;
    renderApp(config, configErrors, initialValue);
  }

  const jotform = getJotform();

  if (!jotform) {
    render(DEFAULT_CONFIG, [], "");

    return;
  }

  jotform.subscribe("ready", (data?: unknown) => {
    log("ready data", data);

    const setting = jotform.getWidgetSetting("columns") ?? "";

    log("columns setting", setting);

    const { config, errors } = parseConfig(setting);

    log("config", config);

    if (errors.length > 0) {
      log("config errors", errors);
    }

    render(config, errors, getSavedValue(data));
  });

  // Fallback so the widget never stays blank if "ready" doesn't arrive.
  window.setTimeout(() => render(DEFAULT_CONFIG, [], ""), READY_TIMEOUT_MS);
}
