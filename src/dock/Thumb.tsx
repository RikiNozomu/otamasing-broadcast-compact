/** One picture thumbnail in the dock: click to show it, ✕ to remove it (used by the horse pictures). */
import { useImage } from "../lib/images";
import { cx } from "@otamasing/broadcast-shared/lib/cx";

export function Thumb({ k, rev, on, n, onShow, onRemove }: { k: string; rev: number | undefined; on: boolean; n: number; onShow: () => void; onRemove: () => void }) {
  const url = useImage(k, rev);
  return (
    <div className={cx("relative aspect-video border-2 bg-studio bg-cover bg-center", on ? "border-yellow" : "border-line")} style={{ backgroundImage: url ? `url("${url}")` : undefined }} data-thumb={n}>
      <button type="button" className="absolute inset-0" aria-pressed={on} aria-label={`แสดงรูปที่ ${n}`} onClick={onShow} />
      <span className={cx("pointer-events-none absolute top-0 left-0 px-1 font-display text-[13px] font-bold", on ? "bg-yellow text-navy" : "bg-navy text-white")}>{n}</span>
      <button type="button" aria-label={`ลบรูปที่ ${n}`} onClick={onRemove}
        className="absolute top-0 right-0 bg-danger px-1.5 text-[11px] leading-[18px] text-white">✕</button>
    </div>
  );
}
