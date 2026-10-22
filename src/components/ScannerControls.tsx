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
        <div className="scanner-controls">
            <button
                type="button"
                className="scanner-controls__open"
                onClick={onOpenCamera}
            >
                <span className="scanner-controls__open-title">Open camera</span>
                <span className="scanner-controls__open-hint">
                    Scan a barcode or QR code with your device camera
                </span>
            </button>

            <button type="button" onClick={onClear} disabled={!hasItems}>
                Clear all
            </button>
        </div>
    );
}