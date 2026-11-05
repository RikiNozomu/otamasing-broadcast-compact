/**
 * Tab "ม้า": horse profiles. Pick a horse, put it on screen, edit its facts, pictures (horse, owner's silks)
 * and past races; the currency prize money is shown in applies to every horse.
 */
import { AnimatePresence } from "motion/react";
import { useState, type ReactNode } from "react";
import { exportHorse, horseOf, HOME, newId, parseActive } from "../lib/model";
import {
  COATS, CURRENCIES, HorseSchema, careerNewestFirst, horsePhotoKey, posText, rateOf, recordFromRaces, recordText, setHorseAuto, showHorsePage, silksKey, useHorsePage, dotDate,
  CareerRaceSchema, SilksSchema, SILKS_BODY, SILKS_SLEEVES, type CareerRace, type Silks, type Coat, type Currency, type Horse,
} from "../lib/horses";
import { bumpImage, update, useData } from "../lib/store";
import { deleteImage, putImage, useImage } from "../lib/images";
import { cx } from "../lib/cx";
import { Button, buttonClass } from "../components/Button";
import { Field, inputClass } from "../components/Field";
import { Section, hintClass } from "../components/Section";
import { Switch } from "../components/Switch";
import { PageButtons } from "../components/PageButtons";
import { SilksSvg } from "../components/SilksSvg";
import { Stage } from "../overlay/Stage";
import { HorseScene } from "../overlay/HorseScene";
import { FlagPicker } from "./FlagPicker";
import { ExportPanel } from "./ExportPanel";

const CODES = Object.keys(CURRENCIES) as Currency[];
const num = (v: string) => (v === "" ? null : Math.max(0, Math.round(+v)));

const updateHorse = (id: string, fn: (h: Horse) => Horse) => update((d) => ({ ...d, horses: d.horses.map((h) => (h.id === id ? fn(h) : h)) }));

/** One picture of the horse (its photo or the owner's silks): upload, replace, remove. */
function PictureField({ k, label, testId, contain, light }: { k: string; label: string; testId: string; contain?: boolean; light?: boolean }) {
  const d = useData();
  const url = useImage(k, d.images[k]);
  const put = async (f: File | undefined) => { if (!f) return; await putImage(k, f); bumpImage(k); };
  const remove = async () => {
    await deleteImage(k).catch(() => {});
    update((x) => { const images = { ...x.images }; delete images[k]; return { ...x, images }; });
  };
  return (
    <div className="grid gap-1.5 text-[13px]">
      <span>{label}</span>
      <div className={cx("aspect-video border border-line bg-center bg-no-repeat", contain ? "bg-contain" : "bg-cover", light && url ? "bg-white" : "bg-panel")} data-testid={`${testId}-thumb`}
        style={{ backgroundImage: url ? `url("${url}")` : undefined }}>
        {!url && <span className="grid h-full place-items-center text-xs text-ink-muted">ยังไม่มีรูป</span>}
      </div>
      <span className="flex flex-wrap gap-1.5">
        <label className={buttonClass("primary")} htmlFor={testId}>{url ? "เปลี่ยนรูป…" : "เลือกรูป…"}</label>
        <input type="file" id={testId} data-testid={testId} accept="image/*,.svg" hidden onChange={(e) => { put(e.target.files?.[0]).finally(() => { e.target.value = ""; }); }} />
        {url && <Button onClick={remove}>ลบรูป</Button>}
      </span>
    </div>
  );
}

function HorsePages({ h }: { h: Horse }) {
  const { page, count } = useHorsePage(h);
  const set = (patch: Parameters<typeof setHorseAuto>[1]) => updateHorse(h.id, (x) => ({ ...x, view: setHorseAuto(x, patch) }));
  return (
    <Section title="หน้าบนจอ">
      <PageButtons label="หน้า" count={count} page={page} testId="horse-pages" onPick={(i) => updateHorse(h.id, (x) => ({ ...x, view: showHorsePage(x, i) }))} />
      {count > 1 ? (
        <>
          <Switch on={h.view.auto} label="วนหน้าอัตโนมัติ" testId="horse-auto" onToggle={() => set({ auto: !h.view.auto })} />
          <label className="flex items-center justify-between gap-3 text-[13px]" htmlFor="horse-sec">
            <span className="whitespace-nowrap">เปลี่ยนหน้าทุกกี่วินาที</span>
            <input id="horse-sec" className={cx(inputClass, "w-20 text-center")} type="number" min={1} max={600} step={1} value={h.view.seconds}
              onChange={(e) => { const v = Math.round(+e.target.value); if (v >= 1 && v <= 600) set({ seconds: v }); }} />
          </label>
          <span className={hintClass}>หน้า 1 คือข้อมูลม้า หน้า 2 คือ Pedigree (ถ้าใส่พ่อแม่) หน้าต่อไปคือผลงาน 7 รายการต่อหน้า เรียงจากใหม่ไปเก่า</span>
        </>
      ) : <span className={hintClass}>ยังไม่มีผลงานและ Pedigree แสดงหน้าข้อมูลหน้าเดียว</span>}
    </Section>
  );
}

function CareerEditor({ h }: { h: Horse }) {
  const [open, setOpen] = useState<number | null>(null);
  const setRace = (i: number, patch: Partial<CareerRace>) => updateHorse(h.id, (x) => ({ ...x, races: x.races.map((r, j) => (j === i ? { ...r, ...patch } : r)) }));
  // shown newest first, edited by their place in the stored list
  const order = careerNewestFirst({ races: h.races.map((r, i) => ({ ...r, i })) }) as (CareerRace & { i: number })[];
  const add = () => {
    const r = CareerRaceSchema.parse({ date: new Date().toISOString().slice(0, 10), name: "New Race" });
    updateHorse(h.id, (x) => ({ ...x, races: [...x.races, r] }));
    setOpen(h.races.length);
  };
  const cellIn = (i: number, k: keyof CareerRace, label: string, extra: Record<string, string> = {}) => (
    <label className="grid gap-0.5 text-[11px] text-ink-muted">
      {label}
      <input className={inputClass} aria-label={label} value={(h.races[i][k] as string | number | null) ?? ""} {...extra}
        onChange={(e) => setRace(i, { [k]: extra.type === "number" ? num(e.target.value) || null : e.target.value } as Partial<CareerRace>)} />
    </label>
  );
  return (
    <Section title={`ผลงาน ${h.races.length} รายการ`}>
      <div className="grid gap-1" data-testid="career-list">
        {order.map(({ i, ...r }) => (
          <div key={i} className="border border-line bg-panel">
            <button type="button" aria-expanded={open === i} onClick={() => setOpen((o) => (o === i ? null : i))}
              className="grid w-full grid-cols-[72px_minmax(0,1fr)_auto] items-center gap-2 px-2 py-1.5 text-left text-xs">
              <span className="text-ink-muted">{dotDate(r.date)}</span>
              <span className="truncate font-medium">{r.name}{r.grade && <span className="ml-1.5 bg-navy px-1 text-[10px]">{r.grade}</span>}</span>
              <span className="font-display text-sm font-bold">{posText(r)}</span>
            </button>
            {open === i && (
              <div className="grid gap-1.5 border-t border-line p-2" data-testid="career-edit">
                <div className="grid grid-cols-[130px_minmax(0,1fr)] gap-1.5">
                  {cellIn(i, "date", "วันที่", { type: "date" })}
                  {cellIn(i, "name", "ชื่อรายการ")}
                </div>
                <div className="grid grid-cols-[60px_minmax(0,1fr)_76px_70px] gap-1.5">
                  {cellIn(i, "grade", "เกรด", { placeholder: "G1" })}
                  {cellIn(i, "course", "สนาม")}
                  <label className="grid gap-0.5 text-[11px] text-ink-muted">พื้น
                    <select className={inputClass} aria-label="พื้น" value={r.surface} onChange={(e) => setRace(i, { surface: e.target.value as CareerRace["surface"] })}>
                      {["Turf", "Dirt", "Jump"].map((s) => <option key={s}>{s}</option>)}
                    </select>
                  </label>
                  {cellIn(i, "distanceM", "ระยะ (ม.)", { type: "number" })}
                </div>
                <div className="grid grid-cols-[50px_60px_70px_50px_minmax(0,1fr)] gap-1.5">
                  {cellIn(i, "fav", "เต็ง", { type: "number" })}
                  {cellIn(i, "finish", "อันดับ", { type: "number" })}
                  <label className="grid gap-0.5 text-[11px] text-ink-muted">ไม่จบ
                    <select className={inputClass} aria-label="ไม่จบ" value={r.outcome ?? ""} onChange={(e) => setRace(i, { outcome: (e.target.value || null) as CareerRace["outcome"], finish: e.target.value ? null : r.finish })}>
                      <option value="">–</option><option value="dnf">DNF</option><option value="dq">DQ</option>
                    </select>
                  </label>
                  {cellIn(i, "field", "จาก", { type: "number" })}
                  {cellIn(i, "time", "เวลา", { placeholder: "1:58.6" })}
                </div>
                {cellIn(i, "other", r.finish === 1 ? "ม้าที่ 2 (เราชนะ ขึ้นในวงเล็บ)" : "ม้าที่ชนะรายการ")}
                <Button variant="danger" className="justify-self-end" onClick={() => { setOpen(null); updateHorse(h.id, (x) => ({ ...x, races: x.races.filter((_, j) => j !== i) })); }}>ลบรายการนี้</Button>
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-1.5">
        <Button onClick={add}>+ เพิ่มผลงาน</Button>
      </div>
    </Section>
  );
}

const BODY_LABEL: Record<Silks["pattern"], string> = {
  plain: "Plain", hoop1: "Hoop", hoop2: "Two hoops", hoop3: "Three hoops", belt: "Belt", sash: "Sash", cross: "Crossbelts", stripes: "Stripes",
  seams: "Seams", braces: "Braces", halves: "Halves", quartered: "Quartered", check: "Check", harlequin: "Harlequin", diamondBand: "Diamonds",
  chevron: "Chevron", bigV: "Large V", sawtooth: "Zigzag", hash: "Hash", yoke: "Yoke", spots: "Spots", stars: "Stars", star: "Star", ring: "Ring", diamond: "Diamond",
};
const SLEEVE_LABEL: Record<Silks["sleevePattern"], string> = {
  plain: "Plain", hoop1: "Armlet", hoop2: "Two armlets", hoop3: "Three armlets", stripes: "Stripes", chevrons: "Chevrons",
  diamonds: "Diamonds", check: "Check", spots: "Spots", stars: "Stars", cuffs: "Cuffs", halved: "Halved",
};

/** The owner's silks drawn as SVG: colours and patterns of the body and the sleeves. An uploaded picture takes its place. */
function SilksSection({ h }: { h: Horse }) {
  const s = h.silks;
  const set = (patch: Partial<Silks>) => updateHorse(h.id, (x) => ({ ...x, silks: { ...(x.silks ?? SilksSchema.parse({})), ...patch } }));
  const color = (k: "body" | "accent" | "sleeves" | "sleeveAccent", label: string) => (
    <label className="grid justify-items-center gap-0.5 text-[11px] text-ink-muted">{label}
      <input type="color" aria-label={`สีเสื้อ ${label}`} className="h-7 w-full cursor-pointer border border-line bg-transparent p-0" value={s![k]} onChange={(e) => set({ [k]: e.target.value.toUpperCase() })} />
    </label>
  );
  return (
    <Section title="สีเสื้อเจ้าของ (วาดเป็น SVG)">
      <Switch on={!!s} label="แสดงสีเสื้อ" testId="silks-on" onToggle={() => updateHorse(h.id, (x) => ({ ...x, silks: x.silks ? null : SilksSchema.parse({}) }))} />
      {s && (
        <>
          <div className="grid grid-cols-[120px_minmax(0,1fr)] items-center gap-2">
            <span className="grid aspect-video place-items-center rounded-[6px] bg-white p-1"><SilksSvg silks={s} className="h-full w-full" /></span>
            <div className="grid gap-1.5">
              <select aria-label="ลายตัวเสื้อ" className={inputClass} value={s.pattern} onChange={(e) => set({ pattern: e.target.value as Silks["pattern"] })}>
                {SILKS_BODY.map((p) => <option key={p} value={p}>ตัว: {BODY_LABEL[p]}</option>)}
              </select>
              <select aria-label="ลายแขนเสื้อ" className={inputClass} value={s.sleevePattern} onChange={(e) => set({ sleevePattern: e.target.value as Silks["sleevePattern"] })}>
                {SILKS_SLEEVES.map((p) => <option key={p} value={p}>แขน: {SLEEVE_LABEL[p]}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {color("body", "ตัว")}{color("accent", "ลายตัว")}{color("sleeves", "แขน")}{color("sleeveAccent", "ลายแขน")}
          </div>
        </>
      )}
      <span className={hintClass}>ถ้าอัปรูปสีเสื้อ (PNG หรือ .svg) ไว้ในส่วนรูป จะใช้รูปนั้นแทน · สีเสื้อที่วาดนี้อยู่ในไฟล์ JSON ด้วย</span>
    </Section>
  );
}

function CurrencySection() {
  const d = useData();
  const s = d.horseSettings;
  const set = (patch: Partial<typeof s>) => update((x) => ({ ...x, horseSettings: { ...x.horseSettings, ...patch } }));
  return (
    <Section title="สกุลเงินรางวัล (ใช้กับม้าทุกตัว)">
      <select aria-label="สกุลเงินรางวัล" data-testid="horse-currency" className={inputClass} value={s.currency} onChange={(e) => set({ currency: e.target.value as typeof s.currency })}>
        <option value="own">ตามสกุลเงินของม้าแต่ละตัว</option>
        {CODES.map((c) => <option key={c} value={c}>{c} ({CURRENCIES[c].symbol.trim()})</option>)}
      </select>
      <details className="text-[13px]">
        <summary className="cursor-pointer text-ink-muted">อัตราแลกเปลี่ยน (ค่าของ 1 หน่วย เป็น USD)</summary>
        <div className="mt-1.5 grid grid-cols-3 gap-1.5">
          {CODES.filter((c) => c !== "USD").map((c) => (
            <label key={c} className="grid gap-0.5 text-[11px] text-ink-muted">{c}
              <input className={inputClass} type="number" min={0} step="any" aria-label={`อัตรา ${c}`} value={rateOf(s, c)}
                onChange={(e) => { const v = +e.target.value; if (v > 0) set({ rates: { ...s.rates, [c]: v } }); }} />
            </label>
          ))}
        </div>
        <Button className="mt-1.5" onClick={() => set({ rates: {} })}>คืนค่าเริ่มต้น</Button>
      </details>
      <span className={hintClass}>ถ้าไม่ตรงกับสกุลเงินของม้า จะแปลงตามอัตราข้างบน และขึ้น ≈ หน้าตัวเลข</span>
    </Section>
  );
}

export function HorsesTab() {
  const d = useData();
  const a = parseActive(d.active);
  const [sel, setSel] = useState<string | null>(a.horseId ?? d.horses[0]?.id ?? null);
  const [confirmDel, setConfirmDel] = useState(false);
  const [exporting, setExporting] = useState(false);
  const h = d.horses.find((x) => x.id === sel) ?? d.horses[0];

  const add = () => {
    const id = newId();
    update((x) => ({ ...x, horses: [...x.horses, { ...HorseSchema.parse({ name: "New Horse" }), id }] }));
    setSel(id);
  };
  const list = (
    <div className="flex flex-wrap gap-1" role="tablist" aria-label="เลือกม้า">
      {d.horses.map((x) => {
        const on = x.id === h?.id;
        return (
          <button key={x.id} type="button" role="tab" data-horse={x.id} aria-selected={on} onClick={() => { setSel(x.id); setConfirmDel(false); setExporting(false); }}
            className={cx("inline-flex items-center gap-1.5 border px-2.5 py-1 font-display text-base leading-[normal] font-bold uppercase", on ? "border-yellow bg-yellow text-navy" : "border-line bg-studio text-ink-muted")}>
            {a.horseId === x.id && <span className="size-[7px] rounded-full bg-ok" title="Active" />}{x.name}
          </button>
        );
      })}
      <button type="button" onClick={add} className="border border-dashed border-line px-2.5 py-1 text-[13px] text-ink-muted">+ เพิ่มม้า</button>
    </div>
  );
  if (!h) return <div className="grid content-start gap-3 p-3" role="tabpanel" id="p-horses">{list}<p className={hintClass}>ยังไม่มีม้า กด "+ เพิ่มม้า" หรือนำเข้า JSON ที่มี "horses" ได้ที่แท็บภาพรวม</p></div>;

  const isAct = a.horseId === h.id;
  const set = (patch: Partial<Horse>) => updateHorse(h.id, (x) => ({ ...x, ...patch }));
  const text = (k: "name" | "sire" | "dam" | "bms" | "sireSire" | "sireDam" | "damDam" | "owner" | "trainer", label: string, extra: Record<string, string> = {}) => (
    <Field id={`h-${k}`} label={label}>
      <input className={inputClass} id={`h-${k}`} value={h[k]} {...extra} onChange={(e) => set({ [k]: e.target.value })} />
    </Field>
  );
  const recIn = (k: keyof Horse["record"], label: string) => (
    <label className="grid gap-0.5 text-[11px] text-ink-muted">{label}
      <input className={inputClass} type="number" min={0} aria-label={`สถิติ ${label}`} value={h.record[k]} onChange={(e) => set({ record: { ...h.record, [k]: num(e.target.value) ?? 0 } })} />
    </label>
  );
  const flagRow = (k: "trainedIn" | "bornIn", label: string): ReactNode => (
    <Field id={`h-${k}`} label={label}>
      <span className="w-14"><FlagPicker label={label} value={h[k]} onChange={(c) => set({ [k]: c })} /></span>
    </Field>
  );
  const remove = async () => {
    await Promise.all([horsePhotoKey(h.id), silksKey(h.id)].map((k) => deleteImage(k).catch(() => {})));
    update((x) => {
      const images = { ...x.images };
      delete images[horsePhotoKey(h.id)]; delete images[silksKey(h.id)];
      return { ...x, images, horses: x.horses.filter((y) => y.id !== h.id), active: x.active === horseOf(h.id) ? HOME : x.active };
    });
    setConfirmDel(false);
    setSel(null);
  };

  return (
    <div className="grid content-start gap-3 p-3" role="tabpanel" id="p-horses" aria-labelledby="tab-horses">
      {list}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-ink-muted">
        <span>{isAct ? "ม้าตัวนี้ Active อยู่ แก้แล้วขึ้นจอทันที" : "ม้าตัวนี้ไม่ได้ Active (ดูพรีวิวด้านล่าง)"}</span>
        <span className="flex flex-wrap gap-1.5">
          {/* goes on screen from the profile page */}
          {!isAct && <Button variant="primary" onClick={() => update((x) => ({ ...x, active: horseOf(h.id), horses: x.horses.map((y) => (y.id === h.id ? { ...y, view: showHorsePage(y, 0) } : y)) }))}>ตั้งเป็น Active</Button>}
          <Button aria-expanded={exporting} onClick={() => setExporting((x) => !x)}>ส่งออกม้าตัวนี้</Button>
          <Button variant="danger" onClick={() => setConfirmDel(true)}>ลบ</Button>
        </span>
      </div>
      {confirmDel && (
        <div role="alertdialog" aria-label="ยืนยันลบม้า" className="flex flex-wrap items-center justify-between gap-2 border border-danger-ink bg-danger-bg px-2.5 py-2 text-[13px]">
          <span>ลบ {h.name} พร้อมรูปและผลงาน?</span>
          <span className="flex gap-1.5"><Button variant="danger" onClick={remove}>ลบเลย</Button><Button onClick={() => setConfirmDel(false)}>ยกเลิก</Button></span>
        </div>
      )}
      <AnimatePresence>
        {exporting && (
          <ExportPanel key="export" onClose={() => setExporting(false)}
            job={{ name: `horse-${h.name.replace(/\W+/g, "") || "horse"}.json`, text: JSON.stringify(exportHorse(d, h.id), null, 2), count: 1 }} />
        )}
      </AnimatePresence>
      {!isAct && <div className="relative aspect-video overflow-hidden border border-line" data-testid="horse-preview"><Stage className="pointer-events-none"><HorseScene horse={h} /></Stage></div>}

      <HorsePages h={h} />
      <CurrencySection />
      <Section title="รูป">
        <div className="grid grid-cols-2 gap-2">
          <PictureField k={horsePhotoKey(h.id)} label="รูปม้า (ซ้ายจอ)" testId="horse-photo-file" />
          <PictureField k={silksKey(h.id)} label="รูปสีเสื้อ (ถ้ามี)" testId="silks-file" contain light />
        </div>
        <span className={hintClass}>รูปม้าแนวตั้งจะชัดที่สุด (ช่องรูปกว้าง 1/3 ของจอ) · รูปสีเสื้อใช้ PNG หรือ .svg ทรงเสื้อมีแขนได้เลย (ใช้แทนเสื้อที่วาด) บนจอจะอยู่ในกรอบสีขาว · รูปเก็บในเครื่องนี้ ไม่อยู่ในไฟล์ JSON</span>
      </Section>
      <SilksSection h={h} />
      <Section title="ข้อมูลม้า">
        {text("name", "ชื่อม้า")}
        {flagRow("trainedIn", "ประเทศที่ฝึก")}
        {flagRow("bornIn", "ประเทศเกิด")}
        <Field id="h-foaled" label="วันเกิด">
          <input className={inputClass} id="h-foaled" type="date" value={h.foaled} onChange={(e) => set({ foaled: e.target.value })} />
        </Field>
        <Field id="h-sex" label="เพศ">
          <select id="h-sex" className={inputClass} value={h.sex ?? ""} onChange={(e) => set({ sex: (e.target.value || null) as Horse["sex"] })}>
            <option value="">ไม่ระบุ</option>
            <option value="M">ผู้ (Colt / Horse)</option>
            <option value="F">เมีย (Filly / Mare)</option>
            <option value="G">ตอน (Gelding)</option>
          </select>
        </Field>
        <Field id="h-coat" label="สีขน">
          <span className="flex items-center gap-1.5">
            <span className="size-5 flex-none border border-white" style={{ background: h.coat ? COATS[h.coat].color : "transparent" }} />
            <select id="h-coat" className={inputClass} value={h.coat ?? ""} onChange={(e) => set({ coat: (e.target.value || null) as Coat | null })}>
              <option value="">ไม่ระบุ</option>
              {(Object.keys(COATS) as Coat[]).map((c) => <option key={c} value={c}>{COATS[c].th}</option>)}
            </select>
          </span>
        </Field>
        {text("owner", "เจ้าของ")}
        {text("trainer", "เทรนเนอร์")}
      </Section>
      <Section title="Pedigree (3 รุ่น)">
        {text("sire", "พ่อพันธุ์ (Sire)")}
        {text("sireSire", "พ่อของพ่อ")}
        {text("sireDam", "แม่ของพ่อ")}
        {text("dam", "แม่พันธุ์ (Dam)")}
        {text("bms", "พ่อของแม่ (BMS)")}
        {text("damDam", "แม่ของแม่")}
        <span className={hintClass}>ใส่พ่อหรือแม่แล้วจะมีหน้า Pedigree ต่อจากหน้าข้อมูลม้า ฝั่งผู้พื้นฟ้าอ่อน ฝั่งเมียพื้นแดงอ่อน</span>
      </Section>
      <Section title={`สถิติ ${recordText(h.record)}`}>
        <div className="grid grid-cols-4 gap-1.5">
          {recIn("starts", "ลงแข่ง")}{recIn("first", "ที่ 1")}{recIn("second", "ที่ 2")}{recIn("third", "ที่ 3")}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <Button disabled={!h.races.length} onClick={() => set({ record: recordFromRaces(h) })}>นับจากผลงานด้านล่าง</Button>
          <span className={hintClass}>ไม่ติดอันดับ = ลงแข่ง − ที่ 1 − ที่ 2 − ที่ 3</span>
        </div>
        <Field id="h-earn" label="เงินรางวัล">
          <span className="grid grid-cols-[minmax(0,1fr)_76px] gap-1.5">
            <input className={inputClass} id="h-earn" type="number" min={0} value={h.earnings ?? ""} onChange={(e) => set({ earnings: e.target.value === "" ? null : Math.max(0, +e.target.value) })} />
            <select aria-label="สกุลเงินของม้า" className={inputClass} value={h.currency} onChange={(e) => set({ currency: e.target.value as Currency })}>
              {CODES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </span>
        </Field>
      </Section>
      <CareerEditor h={h} />
    </div>
  );
}
