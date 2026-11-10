import { describe, expect, it } from "vitest";
import { HorseSchema } from "../../src/lib/horses";
import { mapImageRefs } from "../../src/lib/imageRefs";
import { clampFrame, DEFAULT_FRAME, dragFrame, frameOf, frameStyle, withFrame, zoomFrame } from "../../src/lib/photoFrame";
import { sampleData } from "../../src/lib/sample";

const box = { w: 640, h: 1080 };

describe("horse picture position and zoom", () => {
  it("a horse from an older file has no frames, and a picture without one is centred", () => {
    const h = HorseSchema.parse({ name: "Old", photos: { keys: ["image/1.png"] } });
    expect(h.photos.frames).toEqual({});
    expect(frameOf(h.photos.frames, "image/1.png")).toEqual({ x: 50, y: 50, zoom: 1 });
    expect(HorseSchema.parse({ name: "New", photos: { keys: ["a"], frames: { a: { x: 20 } } } }).photos.frames.a).toEqual({ x: 20, y: 50, zoom: 1 });
    expect(() => HorseSchema.parse({ name: "Bad", photos: { frames: { a: { zoom: 9 } } } })).toThrow();
  });
  it("the picture follows the pointer: dragging left shows more of its right side", () => {
    // a landscape picture 1920x1080 covers the 640x1080 slot at its own height: 1280 px hang over
    const img = { w: 1920, h: 1080 };
    expect(dragFrame(DEFAULT_FRAME, -128, 0, box, img).x).toBe(60);
    expect(dragFrame(DEFAULT_FRAME, 640, 0, box, img).x).toBe(0);
    // it does not overflow up and down, so dragging up and down does nothing until zoomed in
    expect(dragFrame(DEFAULT_FRAME, 0, -100, box, img).y).toBe(50);
    const zoomed = zoomFrame(DEFAULT_FRAME, 2);
    expect(dragFrame(zoomed, 0, -108, box, img).y).toBe(60);
  });
  it("keeps x, y between 0 and 100 and the zoom between 1 and 4", () => {
    expect(clampFrame({ x: -5, y: 140, zoom: 7 })).toEqual({ x: 0, y: 100, zoom: 4 });
    expect(zoomFrame(DEFAULT_FRAME, 0.2).zoom).toBe(1);
  });
  it("crops at x / y and zooms on that same point", () => {
    expect(frameStyle({ x: 30, y: 10, zoom: 1.5 })).toMatchObject({ objectFit: "cover", objectPosition: "30% 10%", transformOrigin: "30% 10%", transform: "scale(1.5)" });
    expect(frameStyle(DEFAULT_FRAME).transform).toBeUndefined();
  });
  it("a centred, unzoomed frame is left out of the data", () => {
    const fs = withFrame({}, "a", { x: 20, y: 50, zoom: 1 });
    expect(fs).toEqual({ a: { x: 20, y: 50, zoom: 1 } });
    expect(withFrame(fs, "a", DEFAULT_FRAME)).toEqual({});
  });
  it("a frame follows its picture when the picture is renamed on import, and goes when the picture goes", () => {
    const d = sampleData();
    d.horses[0].photos.keys = ["image/1.png", "image/2.png"];
    d.horses[0].photos.frames = { "image/1.png": { x: 10, y: 20, zoom: 2 }, "image/2.png": { x: 90, y: 50, zoom: 1 } };
    const next = mapImageRefs(d, (k) => (k === "image/1.png" ? "image/9.png" : null));
    expect(next.horses[0].photos.frames).toEqual({ "image/9.png": { x: 10, y: 20, zoom: 2 } });
  });
});
