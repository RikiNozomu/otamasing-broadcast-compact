/**
 * Moving and zooming one horse picture in its slot on the left of the scene. The box is the slot in small
 * (640x1080): drag the picture to move it, scroll or use the slider to zoom, arrow keys nudge it.
 * Every change is saved at once, so the broadcast follows live.
 */
import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import type { PhotoFrame } from "../lib/horseSchema";
import { useImage } from "../lib/images";
import { clampFrame, dragFrame, frameStyle, isDefaultFrame, MAX_ZOOM, MIN_ZOOM, zoomFrame } from "../lib/photoFrame";
import { Button } from "../components/Button";
import { PHOTO_W } from "../overlay/HorseScene";

/** Width of the box in the dock; its height keeps the slot's shape (640x1080). */
const BOX_W = 150;
const BOX_H = Math.round((BOX_W * 1080) / PHOTO_W);

export function PhotoFrameEditor({ k, rev, n, frame, onChange }: { k: string; rev: number | undefined; n: number; frame: PhotoFrame; onChange: (f: PhotoFrame) => void }) {
  const url = useImage(k, rev);
  const img = useRef<HTMLImageElement>(null);
  const drag = useRef<{ x: number; y: number; from: PhotoFrame } | null>(null);
  // while dragging, the box shows the frame at once and the data is saved once per animation frame
  const [live, setLive] = useState<PhotoFrame | null>(null);
  const pending = useRef<PhotoFrame | null>(null);
  const raf = useRef(0);
  useEffect(() => () => cancelAnimationFrame(raf.current), []);
  const shown = live ?? frame;

  const save = (f: PhotoFrame) => {
    pending.current = f;
    if (raf.current) return;
    raf.current = requestAnimationFrame(() => {
      raf.current = 0;
      if (pending.current) onChange(pending.current);
      pending.current = null;
    });
  };
  const natural = () => ({ w: img.current?.naturalWidth ?? 0, h: img.current?.naturalHeight ?? 0 });
  const box = { w: BOX_W, h: BOX_H };

  const down = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, from: frame };
  };
  const move = (e: PointerEvent<HTMLDivElement>) => {
    const s = drag.current;
    if (!s) return;
    const f = dragFrame(s.from, e.clientX - s.x, e.clientY - s.y, box, natural());
    setLive(f);
    save(f);
  };
  const up = () => {
    if (!drag.current) return;
    drag.current = null;
    setLive(null);
  };
  // the wheel zooms instead of scrolling the dock (React's wheel listener is passive, so add one by hand)
  const boxRef = useRef<HTMLDivElement>(null);
  const latest = useRef({ frame, onChange });
  latest.current = { frame, onChange };
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const wheel = (e: globalThis.WheelEvent) => {
      e.preventDefault();
      const { frame: f, onChange: set } = latest.current;
      set(zoomFrame(f, f.zoom + (e.deltaY < 0 ? 0.1 : -0.1)));
    };
    el.addEventListener("wheel", wheel, { passive: false });
    return () => el.removeEventListener("wheel", wheel);
  }, []);
  /** Move the picture itself by (dx, dy) percent: left = the picture goes left (so more of its right side shows). */
  const nudge = (dx: number, dy: number) => onChange(clampFrame({ ...frame, x: frame.x - dx, y: frame.y - dy }));
  const key = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? 10 : 2;
    const d: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    const m = d[e.key];
    if (m) { e.preventDefault(); nudge(m[0], m[1]); }
    else if (e.key === "+" || e.key === "=") { e.preventDefault(); onChange(zoomFrame(frame, frame.zoom + 0.1)); }
    else if (e.key === "-") { e.preventDefault(); onChange(zoomFrame(frame, frame.zoom - 0.1)); }
  };
  const pct = (v: number) => Math.round(v);

  return (
    <div className="grid grid-cols-[auto_1fr] gap-3 border border-line bg-panel p-2" data-testid="photo-frame">
      <div
        className="relative cursor-grab touch-none overflow-hidden border-2 border-yellow bg-studio outline-none select-none focus-visible:ring-2 focus-visible:ring-yellow active:cursor-grabbing"
        style={{ width: BOX_W, height: BOX_H }}
        tabIndex={0} role="application" aria-label={`ตำแหน่งรูปม้าที่ ${n}: ลากเพื่อเลื่อน ลูกกลิ้งเมาส์เพื่อซูม ปุ่มลูกศรเพื่อขยับ`}
        data-testid="photo-frame-box"
        onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onKeyDown={key} ref={boxRef}
      >
        {url && <img ref={img} src={url} alt="" draggable={false} className="pointer-events-none absolute inset-0 size-full" style={frameStyle(shown)} />}
      </div>
      <div className="grid content-start gap-2 text-[13px]">
        <span className="font-bold">จัดตำแหน่งรูปที่ {n}</span>
        <span className="text-xs text-ink-muted" data-testid="photo-frame-pos">ซ้าย–ขวา {pct(shown.x)}% · บน–ล่าง {pct(shown.y)}%</span>
        <label className="grid gap-1" htmlFor="photo-zoom">
          <span className="flex justify-between"><span>ซูม</span><span data-testid="photo-zoom-value">{Math.round(shown.zoom * 100)}%</span></span>
          <input id="photo-zoom" data-testid="photo-zoom" type="range" min={MIN_ZOOM * 100} max={MAX_ZOOM * 100} step={5} value={Math.round(shown.zoom * 100)}
            className="w-full accent-yellow" onChange={(e) => onChange(zoomFrame(frame, +e.target.value / 100))} />
        </label>
        <span className="flex flex-wrap gap-1">
          <Button aria-label="ขยับรูปไปซ้าย" onClick={() => nudge(-5, 0)}>←</Button>
          <Button aria-label="ขยับรูปขึ้น" onClick={() => nudge(0, -5)}>↑</Button>
          <Button aria-label="ขยับรูปลง" onClick={() => nudge(0, 5)}>↓</Button>
          <Button aria-label="ขยับรูปไปขวา" onClick={() => nudge(5, 0)}>→</Button>
        </span>
        <Button disabled={isDefaultFrame(frame)} onClick={() => onChange({ x: 50, y: 50, zoom: 1 })}>กลับไปตรงกลาง</Button>
      </div>
    </div>
  );
}
