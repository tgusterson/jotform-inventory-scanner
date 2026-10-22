import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "./styles/tokens.css";
import App from "./App";
import { DEFAULT_COLUMNS } from "./components/BarcodeScanner/columns";
import { log } from "./components/BarcodeScanner/debug";
import { getJotform } from "./components/BarcodeScanner/jotform";
import { parseColumns } from "./components/BarcodeScanner/parseColumns";
import type { ColumnConfig } from "./components/BarcodeScanner/types";

const root = createRoot(document.getElementById("root")!);
let hasRendered = false;

function render(columns: ColumnConfig[], initialValue: string) {
  if (hasRendered) {
    return;
  }

  hasRendered = true;

  root.render(
    <StrictMode>
      <App columns={columns} initialValue={initialValue} />
    </StrictMode>,
  );
}

function getSavedValue(data: unknown): string {
  if (typeof data === "object" && data !== null && "value" in data) {
    const { value } = data;

    return typeof value === "string" ? value : "";
  }

  return "";
}

const jotform = getJotform();

if (jotform) {
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
  window.setTimeout(() => render(DEFAULT_COLUMNS, ""), 3000);
} else {
  render(DEFAULT_COLUMNS, "");
}