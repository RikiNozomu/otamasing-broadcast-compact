/**
 * Dock (ภาพรวม): the Race Now box in the middle of the screen. Pick the race being run (or "ว่าง" for
 * logo + clock only), its status (waiting / live / finished), the post times' time zone, and the box's place and size, with a small preview.
 * It shows on its own Browser Source (#/race-now), so it never depends on what is Active.
 */
import { RACE_NOW_H, RACE_NOW_STATUS, RACE_NOW_TZ, RACE_NOW_W, newRaceNow, type RaceNow as RN } from "../lib/model";
import { update, useData } from "../lib/store";
import { cx } from "@otamasing/broadcast-shared/lib/cx";
import { Button } from "@otamasing/broadcast-shared/components/Button";
import { Field } from "../components/Field";
import { Section, hintClass } from "@otamasing/broadcast-shared/components/Section";
import { Stage } from "../overlay/Stage";
import { RaceNow, raceNowBox } from "../overlay/RaceNow";

const TZ_LABEL = { th: "เวลาไทย", jp: "เวลาญี่ปุ่น" } as const;
const STATUS_LABEL = { waiting: "Waiting (นับถอยหลัง)", live: "Live", finished: "Finished" } as const;
const chip = (on: boolean) => cx("max-w-[150px] truncate border-2 px-3 py-[3px] font-display text-[17px] font-bold", on ? "border-yellow bg-yellow text-navy" : "border-white bg-navy text-white");

export function RaceNowSection() {
  const d = useData();
  const rn = d.raceNow;
  const set = (patch: Partial<RN>) => update((x) => ({ ...x, raceNow: { ...x.raceNow, ...patch } }));
  const current = d.races.some((r) => r.id === rn.raceId) ? rn.raceId : null;
  const race = d.races.find((r) => r.id === current);
  const box = raceNowBox(rn);
  const slider = (id: string, label: string, value: number, min: number, max: number, step: number, onChange: (v: number) => void, shown: string) => (
    <Field id={id} label={label}>
      <span className="flex items-center gap-2">
        <input id={id} type="range" className="min-w-0 flex-1 accent-yellow" min={min} max={max} step={step} value={value} onChange={(e) => onChange(+e.target.value)} />
        <span className="w-11 text-right text-xs text-ink-muted tabular-nums">{shown}</span>
      </span>
    </Field>
  );
  return (
    <Section title="Race Now (กลางจอ)">
      <span className={hintClass}>ขึ้นในหน้าแยก #/race-now (Browser Source อีกตัว) ไม่ขึ้นกับ Active · เลือกเรสที่กำลังแข่ง จอจะโชว์ชื่อม้าทุกตัว · "ว่าง" = โลโก้ + เวลาปัจจุบันอย่างเดียว · เลือกเรสใหม่ สถานะกลับเป็น Waiting</span>
      <div className="flex flex-wrap items-center gap-1.5">
        <Button variant={rn.hidden ? "danger" : "default"} aria-pressed={rn.hidden} data-testid="rn-hide" onClick={() => set({ hidden: !rn.hidden })}>
          {rn.hidden ? "ซ่อนอยู่ · กดเพื่อโชว์" : "ซ่อนกราฟิก"}
        </Button>
        {rn.hidden && <span className={hintClass}>จอ Race Now ว่างเปล่า (ยังเลือกเรส/ไฮไลต์ได้)</span>}
      </div>
      <div className="flex flex-wrap gap-1" role="group" aria-label="เรสที่กำลังแข่ง" data-testid="rn-buttons">
        <button type="button" data-rn="" aria-pressed={current == null} className={chip(current == null)} onClick={() => set({ raceId: null, status: "waiting", highlight: [] })}>ว่าง</button>
        {d.races.map((r) => (
          <button key={r.id} type="button" data-rn={r.id} aria-pressed={current === r.id} title={`${r.round} ${r.name}`.trim()}
            className={chip(current === r.id)} onClick={() => set({ raceId: current === r.id ? null : r.id, status: "waiting", highlight: [] })}>{r.round || r.name}</button>
        ))}
      </div>
      {race && (
        <>
          <span className="text-[13px]">ไฮไลต์ม้า (กดได้หลายตัว กดซ้ำเพื่อเอาออก)</span>
          <div className="grid grid-cols-8 gap-1" data-testid="rn-hl-buttons">
            {race.runners.map((h) => {
              const on = rn.highlight.includes(h.number);
              return (
                <button key={h.number} type="button" data-rn-hl={h.number} aria-pressed={on} disabled={h.scratched} title={h.name}
                  aria-label={on ? `เอาไฮไลต์เบอร์ ${h.number} ออก` : `ไฮไลต์เบอร์ ${h.number}`}
                  className={cx("border-2 py-[3px] font-display text-[17px] font-bold disabled:opacity-35", on ? "border-yellow bg-yellow text-navy" : "border-white bg-navy text-white")}
                  onClick={() => set({ highlight: on ? rn.highlight.filter((x) => x !== h.number) : [...rn.highlight, h.number] })}>{h.number}</button>
              );
            })}
          </div>
          {rn.highlight.length > 0 && <Button className="w-max px-2.5 py-[3px] text-xs" onClick={() => set({ highlight: [] })}>ล้างไฮไลต์</Button>}
        </>
      )}
      <div className="flex flex-wrap items-center gap-1.5 text-[13px]" role="group" aria-label="สถานะเรส">
        <span className="mr-1">สถานะ</span>
        {RACE_NOW_STATUS.map((k) => (
          <Button key={k} variant={rn.status === k ? "primary" : "default"} aria-pressed={rn.status === k} data-status={k} disabled={current == null}
            className="px-2.5 py-[3px] text-xs" onClick={() => set({ status: k })}>{STATUS_LABEL[k]}</Button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-1.5 text-[13px]" role="group" aria-label="เวลาออกตัวในข้อมูลเป็นเวลา">
        <span className="mr-1">เวลาออกตัวในข้อมูลเป็น</span>
        {RACE_NOW_TZ.map((k) => (
          <Button key={k} variant={rn.tz === k ? "primary" : "default"} aria-pressed={rn.tz === k} data-tz={k} className="px-2.5 py-[3px] text-xs" onClick={() => set({ tz: k })}>{TZ_LABEL[k]}</Button>
        ))}
      </div>
      <span className={hintClass}>นับถอยหลังถึง "เวลาออกตัว" ของเรส (แก้ได้ในแท็บการแข่งขัน) ถึงเวลาแล้วขึ้น SOON · เรส JRA ใช้เวลาญี่ปุ่น</span>
      <div className="relative aspect-video w-full overflow-hidden border border-line bg-[repeating-conic-gradient(#1a1d38_0_25%,#10132B_0_50%)] bg-size-[24px_24px]" data-testid="rn-preview">
        <Stage>
          <span aria-hidden="true" className="absolute border-[6px] border-dashed border-ink-muted/60" style={{ left: box.left, top: box.top, width: box.w, height: box.h }} />
          <RaceNow />
        </Stage>
      </div>
      {slider("rn-x", "ซ้าย ↔ ขวา", rn.x, 0, 100, 0.5, (x) => set({ x }), `${rn.x}%`)}
      {slider("rn-y", "บน ↕ ล่าง", rn.y, 0, 100, 0.5, (y) => set({ y }), `${rn.y}%`)}
      {slider("rn-scale", "ขนาด", rn.scale, 0.5, 1.5, 0.05, (scale) => set({ scale }), `${Math.round(rn.scale * 100)}%`)}
      <div className="flex flex-wrap gap-1.5">
        <Button className="px-2.5 py-[3px] text-xs" onClick={() => { const n = newRaceNow(); set({ x: n.x, y: n.y, scale: n.scale }); }}>ค่าเริ่มต้น (กลางจอ)</Button>
      </div>
      <span className={hintClass}>ขนาด 100% = {RACE_NOW_W}×{RACE_NOW_H} px บนจอ 1920×1080 · ม้าสูงสุด 18 ตัว (3 คอลัมน์ × 6 แถว)</span>
    </Section>
  );
}
