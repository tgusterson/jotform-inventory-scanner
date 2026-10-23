import "./BarcodeScanner.css";
import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import { CameraView } from "./CameraView";
import { ScannerControls } from "./ScannerControls";
import { ScannedItemsTable } from "./ScannedItemsTable";
import type { ColumnConfig, ScannedItem, WidgetConfig } from "../lib/types";
import { itemsReducer } from "../lib/itemsReducer";
import { formatSubmission, parseSubmission } from "../lib/submissionFormat";
import { log } from "../lib/debug";
import { getJotform } from "../lib/jotform";
import { validateItems } from "../lib/validation";

type BarcodeScannerProps = {
  config: WidgetConfig;
  configErrors?: string[];
  initialValue?: string;
};

function initItems({
  columns,
  initialValue,
}: {
  columns: ColumnConfig[];
  initialValue: string;
}): ScannedItem[] {
  const { rows, unmatched } = parseSubmission(initialValue, columns);

  log("restored rows", rows);

  if (unmatched.length > 0) {
    log("unmatched columns", unmatched);
  }

  return rows.map((row) => ({ id: crypto.randomUUID(), ...row }));
}

export function BarcodeScanner({
  config,
  configErrors = [],
  initialValue = "",
}: BarcodeScannerProps) {
  const { columns } = config;
  const [items, dispatch] = useReducer(
    itemsReducer,
    { columns, initialValue },
    initItems,
  );
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [error, setError] = useState("");
  const [showAllErrors, setShowAllErrors] = useState(false);
  const itemsRef = useRef(items);
  const columnsRef = useRef(columns);
  const configRef = useRef(config);
  const hasSubscribedRef = useRef(false);
  const validation = useMemo(() => validateItems(items, config), [items, config]);
  const errorCount = Object.values(validation.errors).reduce(
    (total, fields) => total + Object.keys(fields).length,
    0,
  );

  itemsRef.current = items;

  useEffect(() => {
    columnsRef.current = columns;
    configRef.current = config;
  }, [columns, config]);

  useEffect(() => {
    const jotform = getJotform();

    // StrictMode runs effects twice in development; subscribe only once.
    if (!jotform || hasSubscribedRef.current) {
      return;
    }

    hasSubscribedRef.current = true;

    jotform.subscribe("submit", () => {
      const value = formatSubmission(itemsRef.current, columnsRef.current);

      log("submit value", value);

      const result = validateItems(itemsRef.current, configRef.current);

      log("validation", result);
      setShowAllErrors(true);
      jotform.sendSubmit({ valid: result.valid, value });
    });
  }, []);

  // Keep Jotform's stored value in sync so edits are saved even without a submit.
  useEffect(() => {
    const jotform = getJotform();

    if (!jotform?.sendData) {
      return;
    }

    const value = formatSubmission(items, columns);

    log("sendData", value);
    jotform.sendData({ value });
  }, [items, columns]);

  useEffect(() => {
    const jotform = getJotform();

    if (!jotform) {
      return;
    }

    const frame = requestAnimationFrame(() => {
      jotform.requestFrameResize({
        height: document.documentElement.scrollHeight,
      });
    });

    return () => cancelAnimationFrame(frame);
  }, [items.length, showAllErrors, errorCount]);


  function handleDecode(rawCode: string) {
    dispatch({ type: "add", code: rawCode, columns });
  }

  function openCamera() {
    setError("");
    setIsCameraOpen(true);
  }

  function closeCamera() {
    setIsCameraOpen(false);
  }

  function handleCameraError(message: string) {
    setError(message);
    setIsCameraOpen(false);
  }

  function updateValue(id: string, key: string, value: string) {
    dispatch({ type: "updateValue", id, key, value });
  }

  function deleteItem(id: string) {
    dispatch({ type: "delete", id });
  }

  function clearItems() {
    dispatch({ type: "clear" });
  }

  return (
    <div className="bsit-barcode-scanner">
      {configErrors.length > 0 && (
        <div className="bsit-config-errors" role="alert">
          <p className="bsit-config-errors__title">
            This widget&apos;s settings have problems
          </p>
          <ul className="bsit-config-errors__list">
            {configErrors.map((message, index) => (
              <li key={index}>{message}</li>
            ))}
          </ul>
          <p>Fix the Columns setting in the form builder.</p>
        </div>
      )}

            {isCameraOpen && (
        <CameraView
          onDecode={handleDecode}
          onError={handleCameraError}
          onClose={closeCamera}
        />
      )}

      <ScannerControls
        hasItems={items.length > 0}
        onOpenCamera={openCamera}
        onClear={clearItems}
      />

      {error && (
        <p className="bsit-barcode-scanner__error" role="alert">
          {error}
        </p>
      )}

      {showAllErrors && items.length === 0 && (
        <p className="bsit-barcode-scanner__error" role="alert">
          Scan at least one item
        </p>
      )}

      <ScannedItemsTable
        items={items}
        columns={columns}
        errors={validation.errors}
        showAllErrors={showAllErrors}
        onValueChange={updateValue}
        onDelete={deleteItem}
      />
    </div>
  );
}