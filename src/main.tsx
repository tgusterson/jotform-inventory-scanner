import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import { DEFAULT_COLUMNS } from "./components/BarcodeScanner/columns";
import { getJotform } from "./components/BarcodeScanner/jotform";
import { parseColumns } from "./components/BarcodeScanner/parseColumns";
import type { ColumnConfig } from "./components/BarcodeScanner/types";

const root = createRoot(document.getElementById("root")!);
let hasRendered = false;

function render(columns: ColumnConfig[]) {
  if (hasRendered) {
    return;
  }

  hasRendered = true;

  root.render(
    <StrictMode>
      <App columns={columns} />
    </StrictMode>,
  );
}

const jotform = getJotform();

if (jotform) {
  jotform.subscribe("ready", () => {
    const setting = jotform.getWidgetSetting("columns") ?? "";
    const columns = parseColumns(setting);

    render(columns.length > 0 ? columns : DEFAULT_COLUMNS);
  });

  // Fallback so the widget never stays blank if "ready" doesn't arrive.
  window.setTimeout(() => render(DEFAULT_COLUMNS), 3000);
} else {
  render(DEFAULT_COLUMNS);
}