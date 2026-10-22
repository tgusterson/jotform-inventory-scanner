import { useRef, useState } from "react";
import { useZxing } from "react-zxing";

type ScannedItem = {
  id: string;
  code: string;
  jobNumber: string;
  quantity: number;
};

export function BarcodeScanner() {
  const [items, setItems] = useState<ScannedItem[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const [error, setError] = useState("");

  const lastScanRef = useRef<{
    code: string;
    scannedAt: number;
  } | null>(null);

  const { ref } = useZxing({
    paused: isPaused,

    onDecodeResult(result) {
      const code = result.rawValue.trim();

      if (!code) {
        return;
      }

      const now = Date.now();
      const lastScan = lastScanRef.current;

      // Prevent the camera repeatedly reading the same visible barcode.
      if (lastScan?.code === code && now - lastScan.scannedAt < 2000) {
        return;
      }

      lastScanRef.current = {
        code,
        scannedAt: now,
      };

      setItems((currentItems) => [
        ...currentItems,
        {
          id: crypto.randomUUID(),
          code,
          jobNumber: "",
          quantity: 1,
        },
      ]);
    },

    onError(cameraError) {
      console.error("Camera error:", cameraError);
      setError("Unable to access the camera.");
    },
  });

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
    setItems((currentItems) => currentItems.filter((item) => item.id !== id));
  }

  function clearItems() {
    setItems([]);
    lastScanRef.current = null;
  }

  return (
    <div
      style={{
        width: "100%",
        maxWidth: "800px",
        margin: "0 auto",
        padding: "16px",
        boxSizing: "border-box",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <h1>Barcode Scanner POC</h1>

      <video
        ref={ref}
        muted
        playsInline
        style={{
          display: "block",
          width: "100%",
          maxHeight: "360px",
          objectFit: "cover",
          backgroundColor: "#111",
          borderRadius: "8px",
        }}
      />

      <div
        style={{
          display: "flex",
          gap: "8px",
          marginTop: "12px",
          marginBottom: "20px",
        }}
      >
        <button
          type="button"
          onClick={() => setIsPaused((current) => !current)}
        >
          {isPaused ? "Resume scanner" : "Pause scanner"}
        </button>

        <button
          type="button"
          onClick={clearItems}
          disabled={items.length === 0}
        >
          Clear all
        </button>
      </div>

      {error && <p style={{ color: "#b00020" }}>{error}</p>}

      {items.length === 0 ? (
        <p>Scan a barcode or QR code to add the first row.</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
            }}
          >
            <thead>
              <tr>
                <th style={headerCellStyle}>Code</th>
                <th style={headerCellStyle}>Job number</th>
                <th style={headerCellStyle}>Quantity</th>
                <th style={headerCellStyle}>Action</th>
              </tr>
            </thead>

            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td style={bodyCellStyle}>{item.code}</td>

                  <td style={bodyCellStyle}>
                    <input
                      type="text"
                      value={item.jobNumber}
                      onChange={(event) =>
                        updateJobNumber(item.id, event.target.value)
                      }
                      placeholder="Enter job number"
                      style={inputStyle}
                    />
                  </td>

                  <td style={bodyCellStyle}>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={item.quantity}
                      onChange={(event) =>
                        updateQuantity(
                          item.id,
                          Math.max(1, Number(event.target.value) || 1),
                        )
                      }
                      style={{
                        ...inputStyle,
                        width: "80px",
                      }}
                    />
                  </td>

                  <td style={bodyCellStyle}>
                    <button type="button" onClick={() => deleteItem(item.id)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h2 style={{ marginTop: "24px" }}>Submission preview</h2>

      <pre
        style={{
          padding: "12px",
          overflowX: "auto",
          backgroundColor: "#f4f4f4",
          borderRadius: "6px",
          fontSize: "12px",
        }}
      >
        {JSON.stringify(items, null, 2)}
      </pre>
    </div>
  );
}

const headerCellStyle = {
  padding: "10px",
  borderBottom: "2px solid #ccc",
  textAlign: "left" as const,
  whiteSpace: "nowrap" as const,
};

const bodyCellStyle = {
  padding: "10px",
  borderBottom: "1px solid #ddd",
  verticalAlign: "middle" as const,
};

const inputStyle = {
  width: "100%",
  minWidth: "120px",
  padding: "8px",
  boxSizing: "border-box" as const,
};
