/**
 * Dock (ภาพรวม): the lower third over the live video. Pick a race, then a number button shows that
 * runner's plate (press it again to hide), like the racecard highlight buttons. It shows on top of
 * whatever is Active, blank included. Position and size are set here, with a small preview.
 */
import { LOWER_THIRD_H, LOWER_THIRD_W, newLowerThird, parseActive, type LowerThird as LT } from "../lib/model";
import { update, useData } from "../lib/store";
import { cx } from "../lib/cx";
import { Button } from "../components/Button";
import { Field, inputClass } from "../components/Field";
import { Section, hintClass } from "../components/Section";
import { Stage } from "../overlay/Stage";
import { LowerThird, lowerThirdBox } from "../overlay/LowerThird";

const PRESETS: [string, Pick<LT, "x" | "y">][] = [["ล่างซ้าย", { x: 4, y: 90 }], ["ล่างกลาง", { x: 50, y: 90 }], ["ล่างขวา", { x: 96, y: 90 }], ["บนซ้าย", { x: 4, y: 8 }]];

export function LowerThirdSection() {
  const d = useData();
  const lt = d.lowerThird;
  const set = (patch: Partial<LT>) => update((x) => ({ ...x, lowerThird: { ...x.lowerThird, ...patch } }));
  // the race whose buttons show: the one picked here, else the race on screen, else the first
  const raceId = d.races.some((r) => r.id === lt.raceId) ? lt.raceId : parseActive(d.active).raceId ?? d.races[0]?.id;
  const race = d.races.find((r) => r.id === raceId);
  const box = lowerThirdBox(lt);
  const slider = (id: string, label: string, value: number, min: number, max: number, step: number, onChange: (v: number) => void, shown: string) => (
    <Field id={id} label={label}>
      <span className="flex items-center gap-2">
        <input id={id} type="range" className="min-w-0 flex-1 accent-yellow" min={min} max={max} step={step} value={value} onChange={(e) => onChange(+e.target.value)} />
        <span className="w-11 text-right text-xs text-ink-muted tabular-nums">{shown}</span>
      </span>
    </Field>
  );
  return (
    <Section title="Lower third ม้า (ทับภาพถ่ายทอดสด)">
      <span className={hintClass}>ขึ้นทับทุกหน้าจอ ไม่ขึ้นกับ Active (ใช้คู่กับหน้าเปล่าได้) · กดเบอร์เพื่อโชว์ กดซ้ำเพื่อเอาออก</span>
      {d.races.length === 0 ? <span className={hintClass}>ยังไม่มีรายการแข่ง</span> : (
        <Field id="lt-race" label="รายการ">
          <select id="lt-race" className={inputClass} value={raceId ?? ""}
            // another race: its runners are different, so the plate goes away
            onChange={(e) => set({ raceId: e.target.value, number: e.target.value === lt.raceId ? lt.number : null })}>
            {d.races.map((r) => <option key={r.id} value={r.id}>{`${r.round} ${r.name}`.trim()}</option>)}
          </select>
        </Field>
      )}
      {race && (
        <div className="grid grid-cols-8 gap-1" data-testid="lt-buttons">
          {race.runners.map((h) => {
            const on = lt.raceId === race.id && lt.number === h.number;
            return (
              <button key={h.number} type="button" data-lt={h.number} aria-pressed={on} disabled={h.scratched} title={h.name}
                aria-label={on ? `เอา lower third เบอร์ ${h.number} ออก` : `โชว์ lower third เบอร์ ${h.number}`}
                className={cx("border-2 py-[3px] font-display text-[17px] font-bold disabled:opacity-35", on ? "border-yellow bg-yellow text-navy" : "border-white bg-navy text-white")}
                onClick={() => set(on ? { number: null } : { raceId: race.id, number: h.number })}>{h.number}</button>
            );
          })}
        </div>
      )}
      <div className="relative aspect-video w-full overflow-hidden border border-line bg-[repeating-conic-gradient(#1a1d38_0_25%,#10132B_0_50%)] bg-size-[24px_24px]" data-testid="lt-preview">
        <Stage>
          {/* where the plate goes, also while it is hidden */}
          <span aria-hidden="true" className="absolute border-[6px] border-dashed border-ink-muted/60" style={{ left: box.left, top: box.top, width: box.w, height: box.h }} />
          <LowerThird />
        </Stage>
      </div>
      {slider("lt-x", "ซ้าย ↔ ขวา", lt.x, 0, 100, 0.5, (x) => set({ x }), `${lt.x}%`)}
      {slider("lt-y", "บน ↕ ล่าง", lt.y, 0, 100, 0.5, (y) => set({ y }), `${lt.y}%`)}
      {slider("lt-scale", "ขนาด", lt.scale, 0.5, 1.5, 0.05, (scale) => set({ scale }), `${Math.round(lt.scale * 100)}%`)}
      <div className="flex flex-wrap gap-1.5">
        {PRESETS.map(([label, p]) => <Button key={label} className="px-2.5 py-[3px] text-xs" onClick={() => set(p)}>{label}</Button>)}
        <Button className="px-2.5 py-[3px] text-xs" onClick={() => { const n = newLowerThird(); set({ x: n.x, y: n.y, scale: n.scale }); }}>ค่าเริ่มต้น</Button>
      </div>
      <span className={hintClass}>ขนาด 100% = {LOWER_THIRD_W}×{LOWER_THIRD_H} px บนจอ 1920×1080 · ตำแหน่งนับในพื้นที่ที่เหลือ ป้ายจึงไม่หลุดจอ</span>
    </Section>
  );
}
