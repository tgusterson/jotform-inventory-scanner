type Box = {
    x: number;
    y: number;
    width: number;
    height: number;
};

/**
 * Returns true if a detected barcode box (in video pixel coordinates)
 * sits entirely inside the on-screen frame element.
 *
 * Assumes the video uses object-fit: cover.
 */
export function isBoxInsideFrame(
    box: Box,
    video: HTMLVideoElement,
    frame: HTMLElement,
): boolean {
    const { videoWidth, videoHeight } = video;

    if (!videoWidth || !videoHeight) {
        return false;
    }

    const videoRect = video.getBoundingClientRect();
    const frameRect = frame.getBoundingClientRect();

    // object-fit: cover scales the video to fill the element,
    // then crops whatever overflows equally on both sides.
    const scale = Math.max(
        videoRect.width / videoWidth,
        videoRect.height / videoHeight,
    );
    const offsetX = (videoRect.width - videoWidth * scale) / 2;
    const offsetY = (videoRect.height - videoHeight * scale) / 2;

    // Convert the on-screen frame into video pixel coordinates.
    const left = (frameRect.left - videoRect.left - offsetX) / scale;
    const top = (frameRect.top - videoRect.top - offsetY) / scale;
    const right = left + frameRect.width / scale;
    const bottom = top + frameRect.height / scale;

    return (
        box.x >= left &&
        box.y >= top &&
        box.x + box.width <= right &&
        box.y + box.height <= bottom
    );
}