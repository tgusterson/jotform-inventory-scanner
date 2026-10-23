import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "./styles/tokens.css";
import { BarcodeScanner } from "./BarcodeScanner/BarcodeScanner";
import { bootstrap } from "./lib/bootstrap";

const root = createRoot(document.getElementById("root")!);

bootstrap((config, configErrors, initialValue) => {
  root.render(
    <StrictMode>
      <BarcodeScanner
        config={config}
        configErrors={configErrors}
        initialValue={initialValue}
      />
    </StrictMode>,
  );
});