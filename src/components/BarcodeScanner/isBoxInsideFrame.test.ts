import { describe, expect, it } from "vitest";
import { isBoxInsideFrame } from "./isBoxInsideFrame";

type Rect = { left: number; top: number; width: number; height: number };

function fakeVideo(videoWidth: number, videoHeight: number, rect: Rect) {
  return {
    videoWidth,
    videoHeight,
    getBoundingClientRect: () => rect,
  } as unknown as HTMLVideoElement;
}

function fakeFrame(rect: Rect) {
  return { getBoundingClientRect: () => rect } as unknown as HTMLElement;
}

describe("isBoxInsideFrame", () => {
  // 1:1 scale, no cropping: video pixels map straight onto the screen.
  const video = fakeVideo(640, 480, { left: 0, top: 0, width: 640, height: 480 });
  const frame = fakeFrame({ left: 100, top: 100, width: 200, height: 200 });

  it("returns true when the box is fully inside the frame", () => {
    expect(isBoxInsideFrame({ x: 150, y: 150, width: 50, height: 50 }, video, frame)).toBe(true);
  });

  it("returns false when the box is partly outside the frame", () => {
    expect(isBoxInsideFrame({ x: 280, y: 150, width: 50, height: 50 }, video, frame)).toBe(false);
  });

  it("returns false when the box is completely outside the frame", () => {
    expect(isBoxInsideFrame({ x: 500, y: 400, width: 50, height: 50 }, video, frame)).toBe(false);
  });

  it("returns false when the video has no dimensions yet", () => {
    const emptyVideo = fakeVideo(0, 0, { left: 0, top: 0, width: 640, height: 480 });

    expect(isBoxInsideFrame({ x: 150, y: 150, width: 50, height: 50 }, emptyVideo, frame)).toBe(false);
  });

  describe("object-fit: cover cropping", () => {
    // 1920x1080 stream in a 300x600 element: scale = 600/1080, width is cropped.
    // Scaled video is ~1066.7px wide, so offsetX = (300 - 1066.7) / 2 = -383.3.
    const portraitVideo = fakeVideo(1920, 1080, { left: 0, top: 0, width: 300, height: 600 });
    // Frame fills the middle 100x100 of the element: (100,250)-(200,350).
    const centreFrame = fakeFrame({ left: 100, top: 250, width: 100, height: 100 });

    // Frame in video pixels: x 867..1053, y 450..630 (scale 0.5556).
    it("accepts a box inside the frame after scale and offset are applied", () => {
      expect(isBoxInsideFrame({ x: 900, y: 480, width: 100, height: 100 }, portraitVideo, centreFrame)).toBe(true);
    });

    it("rejects a box that would only fit if the cropped area were ignored", () => {
      // Centre of the raw 1920 width would be 960, but a box at x=100 is far left of the frame.
      expect(isBoxInsideFrame({ x: 100, y: 480, width: 100, height: 100 }, portraitVideo, centreFrame)).toBe(false);
    });

    it("rejects a box overlapping the frame edge", () => {
      expect(isBoxInsideFrame({ x: 1000, y: 480, width: 100, height: 100 }, portraitVideo, centreFrame)).toBe(false);
    });
  });
});
