import "./BarcodeScanner.css";
import { useState } from "react";
import { CameraView } from "./CameraView";
import { ScannerControls } from "./ScannerControls";
import { ScannedItemsTable } from "./ScannedItemsTable";
import type { ScannedItem } from "./types";

export function BarcodeScanner() {
  const [items, setItems] = useState<ScannedItem[]>([]);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [error, setError] = useState("");



  function handleDecode(rawCode: string) {
    const code = rawCode.trim();

    if (!code) {
      return;
    }

    setItems((currentItems) => [
      ...currentItems,
      {
        id: crypto.randomUUID(),
        code,
        jobNumber: "",
        quantity: 1,
      },
    ]);

    closeCamera();
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

  function updateJobNumber(id: string, jobNumber: string) {
    setItems((currentItems) =>
      currentItems.map((item) =>
        item.id === id ? { ...item, jobNumber } : item,
      ),
    );
  }

  function updateQuantity(id: string, quantity: number) {
    setItems((currentItems) =>
      currentItems.map((item) =>
        item.id === id ? { ...item, quantity } : item,
      ),
    );
  }

  function deleteItem(id: string) {
    setItems((currentItems) =>
      currentItems.filter((item) => item.id !== id),
    );
  }

  function clearItems() {
    setItems([]);
  }

  return (
    <div className="barcode-scanner">
      <h1 className="barcode-scanner__title">Barcode Scanner POC</h1>

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
        onJobNumberChange={updateJobNumber}
        onQuantityChange={updateQuantity}
        onDelete={deleteItem}
      />

      <h2 className="submission-preview__title">Submission preview</h2>

      <pre className="submission-preview__json">
        {JSON.stringify(items, null, 2)}
      </pre>
    </div>
  );
}