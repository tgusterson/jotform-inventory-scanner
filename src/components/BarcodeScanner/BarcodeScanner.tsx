import "./BarcodeScanner.css";
import { useEffect, useReducer, useRef, useState } from "react";
import { CameraView } from "./CameraView";
import { ScannerControls } from "./ScannerControls";
import { ScannedItemsTable } from "./ScannedItemsTable";
import type { ColumnConfig } from "./types";
import { itemsReducer, toSubmissionRows } from "./itemsReducer";
import { getJotform } from "./jotform";

type BarcodeScannerProps = {
  columns: ColumnConfig[];
};

export function BarcodeScanner({ columns }: BarcodeScannerProps) {
  const [items, dispatch] = useReducer(itemsReducer, []);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [error, setError] = useState("");
  const itemsRef = useRef(items);
  const hasSubscribedRef = useRef(false);

  itemsRef.current = items;

  useEffect(() => {
    const jotform = getJotform();

    // StrictMode runs effects twice in development; subscribe only once.
    if (!jotform || hasSubscribedRef.current) {
      return;
    }

    hasSubscribedRef.current = true;

    jotform.subscribe("submit", () => {
      const rows = toSubmissionRows(itemsRef.current);

      // TODO: replace the placeholder valid flag once validation is added.
      jotform.sendSubmit({ valid: true, value: JSON.stringify(rows) });
    });
  }, []);

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
    <div className="barcode-scanner">
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
        <p className="barcode-scanner__error" role="alert">
          {error}
        </p>
      )}

      <ScannedItemsTable
        items={items}
        columns={columns}
        onValueChange={updateValue}
        onDelete={deleteItem}
      />

      {import.meta.env.DEV && (
        <>
          <h2 className="submission-preview__title">Submission preview</h2>

          <pre className="submission-preview__json">
            {JSON.stringify(toSubmissionRows(items), null, 2)}
          </pre>
        </>
      )}
    </div>
  );
}