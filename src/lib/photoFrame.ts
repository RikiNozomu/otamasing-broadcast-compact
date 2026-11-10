/**
 * Moving and zooming a horse picture inside its slot (PhotoFrame). The picture covers the slot like
 * `object-fit: cover`; `x` / `y` pick which part is kept (CSS object-position) and the zoom is centred on
 * that same point, so 0 always shows the left / top edge and 100 the right / bottom edge at any zoom.
 */
import type { CSSProperties } from "react";
import { PhotoFrameSchema, type PhotoFrame } from "./horseSchema";

export const DEFAULT_FRAME: PhotoFrame = PhotoFrameSchema.parse({});
export const MIN_ZOOM = 1, MAX_ZOOM = 4;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const round = (v: number, d = 100) => Math.round(v * d) / d;

/** The frame of picture `k` (centred, no zoom when it has none). */
export const frameOf = (frames: Record<string, PhotoFrame> | undefined, k: string): PhotoFrame => frames?.[k] ?? DEFAULT_FRAME;

export const isDefaultFrame = (f: PhotoFrame) => f.x === DEFAULT_FRAME.x && f.y === DEFAULT_FRAME.y && f.zoom === DEFAULT_FRAME.zoom;

/** A frame inside its limits (rounded so the saved data stays short). */
export const clampFrame = (f: PhotoFrame): PhotoFrame => ({ x: round(clamp(f.x, 0, 100)), y: round(clamp(f.y, 0, 100)), zoom: round(clamp(f.zoom, MIN_ZOOM, MAX_ZOOM)) });

/** Style of an <img> that fills its slot (position absolute, inset 0) to show the picture with this frame. */
export const frameStyle = (f: PhotoFrame): CSSProperties => ({
  objectFit: "cover",
  objectPosition: `${f.x}% ${f.y}%`,
  transformOrigin: `${f.x}% ${f.y}%`,
  transform: f.zoom === 1 ? undefined : `scale(${f.zoom})`,
});

type Size = { w: number; h: number };

/**
 * The frame after dragging the picture by (dx, dy) pixels in a slot of size `box`, for a picture of natural size
 * `img`: the picture follows the pointer. Along a side where the picture does not overflow the slot it stays put.
 */
export function dragFrame(f: PhotoFrame, dx: number, dy: number, box: Size, img: Size): PhotoFrame {
  if (!img.w || !img.h || !box.w || !box.h) return f;
  const cover = Math.max(box.w / img.w, box.h / img.h);
  // how far the picture's edge travels as x (or y) goes from 0 to 100
  const spanX = img.w * cover * f.zoom - box.w, spanY = img.h * cover * f.zoom - box.h;
  return clampFrame({
    ...f,
    x: spanX > 0.5 ? f.x - (dx / spanX) * 100 : f.x,
    y: spanY > 0.5 ? f.y - (dy / spanY) * 100 : f.y,
  });
}

/** A frame with the zoom changed (kept between MIN_ZOOM and MAX_ZOOM). */
export const zoomFrame = (f: PhotoFrame, zoom: number): PhotoFrame => clampFrame({ ...f, zoom });

/** The frames with picture `k` set (a centred, unzoomed frame is simply left out). */
export function withFrame(frames: Record<string, PhotoFrame>, k: string, f: PhotoFrame): Record<string, PhotoFrame> {
  const { [k]: _, ...rest } = frames;
  return isDefaultFrame(f) ? rest : { ...rest, [k]: f };
}
