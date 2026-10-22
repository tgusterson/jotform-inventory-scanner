import "./BarcodeScanner.css";
import { useEffect, useReducer, useRef, useState } from "react";
import { CameraView } from "./CameraView";
import { ScannerControls } from "./ScannerControls";
import { ScannedItemsTable } from "./ScannedItemsTable";
import type { ColumnConfig, ScannedItem } from "./types";
import { itemsReducer } from "./itemsReducer";
import { formatSubmission, parseSubmission } from "./submissionFormat";
import { log } from "./debug";
import { getJotform } from "./jotform";

type BarcodeScannerProps = {
  columns: ColumnConfig[];
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
  columns,
  initialValue = "",
}: BarcodeScannerProps) {
  const [items, dispatch] = useReducer(
    itemsReducer,
    { columns, initialValue },
    initItems,
  );
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [error, setError] = useState("");
  const itemsRef = useRef(items);
  const columnsRef = useRef(columns);
  const hasSubscribedRef = useRef(false);

  itemsRef.current = items;

  useEffect(() => {
    columnsRef.current = columns;
  }, [columns]);

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

      // TODO: replace the placeholder valid flag once validation is added.
      jotform.sendSubmit({ valid: true, value });
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
  }, [items.length]);


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

      <ScannedItemsTable
        items={items}
        columns={columns}
        onValueChange={updateValue}
        onDelete={deleteItem}
      />
    </div>
  );
}