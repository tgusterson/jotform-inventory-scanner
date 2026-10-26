import { DEFAULT_COLUMNS } from "./columns";
import { log } from "./debug";
import { getJotform } from "./jotform";
import { parseConfig } from "./parseConfig";
import type { WidgetConfig } from "./types";

export const READY_TIMEOUT_MS = 3000;
export const SETTINGS_TIMEOUT_ERROR =
  "The widget's settings and saved data did not load in time. The default columns are shown, and nothing is saved.";

const DEFAULT_CONFIG: WidgetConfig = { columns: DEFAULT_COLUMNS };

export function getSavedValue(data: unknown): string {
  if (typeof data === "object" && data !== null && "value" in data) {
    const { value } = data;

    return typeof value === "string" ? value : "";
  }

  return "";
}

/**
 * Calls renderApp exactly once: when Jotform is ready, or immediately when standalone.
 * If "ready" hasn't arrived after READY_TIMEOUT_MS, it renders the default
 * columns with settingsFailed = true so the widget can warn the user instead of
 * showing the wrong columns silently. A "ready" that arrives after that is ignored,
 * so it can never replace rows the user has already scanned.
 */
export function bootstrap(
  renderApp: (
    config: WidgetConfig,
    configErrors: string[],
    initialValue: string,
    settingsFailed?: boolean,
  ) => void,
) {
  let hasRendered = false;

  function render(
    config: WidgetConfig,
    configErrors: string[],
    initialValue: string,
    settingsFailed?: boolean,
  ) {
    if (hasRendered) {
      return;
    }

    hasRendered = true;

    if (settingsFailed) {
      renderApp(config, configErrors, initialValue, true);
    } else {
      renderApp(config, configErrors, initialValue);
    }
  }

  const jotform = getJotform();

  if (!jotform) {
    render(DEFAULT_CONFIG, [], "");

    return;
  }

  jotform.subscribe("ready", (data?: unknown) => {
    log("ready data", data, hasRendered ? "(ignored, too late)" : "");

    if (hasRendered) {
      return;
    }

    const setting = jotform.getWidgetSetting("columns");

    log("columns setting", setting, typeof setting);

    const { config, errors } = parseConfig(setting);

    log("config", config);

    if (errors.length > 0) {
      log("config errors", errors);
    }

    render(config, errors, getSavedValue(data));
  });

  window.setTimeout(
    () => render(DEFAULT_CONFIG, [SETTINGS_TIMEOUT_ERROR], "", true),
    READY_TIMEOUT_MS,
  );
}
