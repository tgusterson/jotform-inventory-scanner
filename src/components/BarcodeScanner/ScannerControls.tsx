import "./ScannerControls.css";

type ScannerControlsProps = {
    hasItems: boolean;
    onOpenCamera: () => void;
    onClear: () => void;
};

export function ScannerControls({
    hasItems,
    onOpenCamera,
    onClear,
}: ScannerControlsProps) {
    return (
        <div className="bsit-scanner-controls">
            <button
                type="button"
                className="bsit-scanner-controls__open"
                onClick={onOpenCamera}
            >
                <span className="bsit-scanner-controls__open-title">Open camera</span>
                <span className="bsit-scanner-controls__open-hint">
                    Scan a barcode or QR code with your device camera
                </span>
            </button>

            <button
                type="button"
                className="bsit-scanner-controls__clear"
                onClick={onClear}
                disabled={!hasItems}>
                Clear all
            </button>
        </div>
    );
}