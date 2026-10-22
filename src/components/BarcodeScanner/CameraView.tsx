import { useEffect, useRef, useState } from "react";
import { useZxing } from "react-zxing";
import { isBoxInsideFrame } from "./isBoxInsideFrame";

const SUCCESS_DELAY_MS = 250;

type CameraViewProps = {
    onDecode: (code: string) => void;
    onError: (message: string) => void;
    onClose: () => void;
};

export function CameraView({ onDecode, onError, onClose }: CameraViewProps) {
    const frameRef = useRef<HTMLDivElement>(null);
    const hasDecodedRef = useRef(false);
    const successTimeoutRef = useRef<number | null>(null);
    const [isSuccess, setIsSuccess] = useState(false);

    // If the camera closes during the success animation, cancel the pending timeout.
    useEffect(() => {
        return () => {
            if (successTimeoutRef.current !== null) {
                window.clearTimeout(successTimeoutRef.current);
            }
        };
    }, []);

    const { ref } = useZxing({
        paused: isSuccess,

        onDecodeResult(result) {
            // Accept only one scan each time the camera is opened.
            if (hasDecodedRef.current) {
                return;
            }

            const video = ref.current;
            const frame = frameRef.current;

            if (!video || !frame) {
                return;
            }

            // Ignore codes that aren't fully inside the alignment frame.
            if (!isBoxInsideFrame(result.boundingBox, video, frame)) {
                return;
            }

            hasDecodedRef.current = true;
            setIsSuccess(true);

            // Short vibration on devices that support it.
            navigator.vibrate?.(100);

            // Save the scan straight away.
            onDecode(result.rawValue);

            // Keep the green frame visible briefly, then close.
            successTimeoutRef.current = window.setTimeout(onClose, SUCCESS_DELAY_MS);
        },

        onError(cameraError) {
            console.error("Camera error:", cameraError);
            onError("Unable to access the camera.");
        },
    });

    return (
        <div
            className="camera-view"
            role="dialog"
            aria-modal="true"
            aria-label="Barcode scanner"
        >
            <video ref={ref} className="camera-view__video" muted playsInline />

            <div
                ref={frameRef}
                className={
                    isSuccess
                        ? "camera-view__frame camera-view__frame--success"
                        : "camera-view__frame"
                }
                aria-hidden="true"
            >
                <span className="camera-view__corner camera-view__corner--top-left" />
                <span className="camera-view__corner camera-view__corner--top-right" />
                <span className="camera-view__corner camera-view__corner--bottom-left" />
                <span className="camera-view__corner camera-view__corner--bottom-right" />
            </div>

            <p className="camera-view__hint" aria-live="polite">
                {isSuccess ? "Scanned" : "Align the barcode within the frame to scan"}
            </p>

            <button
                type="button"
                className="camera-view__close"
                onClick={onClose}
                aria-label="Close camera"
            >
                ×
            </button>
        </div>
    );
}