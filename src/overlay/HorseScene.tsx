/**
 * The horse scene (1920x1080). The horse's picture sharp on the left third; on the right, beside the
 * picture, the trained-in flag and the name, then "SIRE – DAM (by BMS)", then the owner (O) and trainer (T).
 * Below that the pages: page 1 is the profile (foaled, coat, born in, trained in, owner with silks,
 * trainer, record, prize money), the next pages the past races newest first. With auto on, the pages take turns.
 */
import { AnimatePresence, motion } from "motion/react";
import { useLayoutEffect, useRef, type ReactNode } from "react";
import { careerPage, COATS, dotDate, earningsIn, horsePhotoKey, moneyText, posText, recordText, silksKey, useHorsePage, CAREER_ROWS, type CareerRace, type Horse } from "../lib/horses";
import { useData } from "../lib/store";
import { useImage } from "../lib/images";
import { GRADE_COLOR } from "../lib/colors";
import { cx } from "../lib/cx";
import { Flag } from "../components/Flag";
import { FitText } from "../components/FitText";
import { Logo } from "../components/Logo";
import { SilksSvg } from "../components/SilksSvg";
import { PageCount, pill } from "./RaceBackdrop";
import { cell, headClass, headLeft, rowMotion } from "./RacecardScene";

/** Width of the picture on the left (a third of the screen). */
export const PHOTO_W = 640;
/** Where the text on the right starts, and its width up to the right margin. */
const LEFT = PHOTO_W + 60, RIGHT = 60, W = 1920 - LEFT - RIGHT;
const CONTENT_TOP = 330;
const ROW_H = 86;

/** A country's English name ("JP" → "Japan"), for the overlay. */
const REGION = new Intl.DisplayNames(["en"], { type: "region" });
const countryName = (c: string) => { try { return REGION.of(c) ?? c; } catch { return c; } };

/** Colour of a grade pill: "Jpn1" like G1, anything else (OP, L…) a muted blue unless known. */
const gradeColor = (g: string) => GRADE_COLOR[g.replace(/^Jpn/i, "G").toUpperCase()] ?? "#4A5590";

function Badge({ letter }: { letter: string }) {
  return <span className="grid size-[44px] flex-none place-items-center rounded-[6px] bg-yellow font-display text-[30px] font-bold text-navy [text-shadow:none]">{letter}</span>;
}

function HorsePhoto({ h }: { h: Horse }) {
  const d = useData();
  const k = horsePhotoKey(h.id);
  const url = useImage(k, d.images[k]);
  return (
    <>
      {/* the same picture faintly across the whole screen, under the navy */}
      {url && <div className="absolute inset-0 scale-110 bg-cover bg-center opacity-35 blur-[18px]" style={{ backgroundImage: `url("${url}")` }} />}
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgb(0_21_125/.9)_0%,rgb(0_21_125/.8)_45%,rgb(0_10_70/.94)_100%)]" />
      <div data-testid="horse-photo" data-has={url ? "" : undefined} className="absolute inset-y-0 left-0 overflow-hidden" style={{ width: PHOTO_W }}>
        {url ? (
          <motion.div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url("${url}")` }}
            initial={{ opacity: 0, scale: 1.04 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8, ease: "easeOut" }} />
        ) : (
          <div className="absolute inset-0 grid place-items-center bg-[radial-gradient(70%_60%_at_50%_45%,#1d2f9e_0%,#0b1a86_60%,var(--color-scene)_100%)]">
            <Logo className="w-56 opacity-30" />
          </div>
        )}
        {/* the right edge melts into the navy, and a yellow rule marks the edge */}
        <div className="absolute inset-y-0 right-0 w-40 bg-[linear-gradient(90deg,transparent,rgb(0_21_125/.85))]" />
      </div>
      <div className="absolute inset-y-0 w-[6px] bg-yellow" style={{ left: PHOTO_W - 6 }} />
      <Logo className="absolute top-[34px] right-[60px] w-40" />
    </>
  );
}

/** Name, pedigree, connections. The name shrinks until it fits beside the logo. */
function Header({ h }: { h: Horse }) {
  const nameRef = useRef<HTMLDivElement>(null);
  const lineRef = useRef<HTMLDivElement>(null);
  const maxWidth = W - 160 - 40;
  useLayoutEffect(() => {
    const line = lineRef.current, name = nameRef.current;
    if (!line || !name) return;
    let s = 112;
    name.style.fontSize = s + "px";
    while (line.scrollWidth > maxWidth && s > 52) { s -= 4; name.style.fontSize = s + "px"; }
  }, [h.name, h.trainedIn, maxWidth]);
  const pedigree = [h.sire, h.dam].filter(Boolean).join(" – ");
  return (
    <div className="absolute grid gap-2 text-white [text-shadow:0_2px_14px_rgb(0_0_0/.45)]" style={{ left: LEFT, top: 44, width: W }}>
      <div ref={lineRef} className="flex w-max items-center gap-5">
        <Flag code={h.trainedIn} className="h-[60px] w-[90px] rounded-[5px]" />
        <div ref={nameRef} data-testid="horse-name" className="font-display text-[112px] leading-[.95] font-bold whitespace-nowrap uppercase">{h.name}</div>
      </div>
      {(pedigree || h.bms) && (
        <div data-testid="pedigree" className="font-display text-[40px] leading-[1.15] font-semibold tracking-[.02em] uppercase">
          {pedigree}{h.bms && <span className="text-white/70">{pedigree ? " " : ""}(by {h.bms})</span>}
        </div>
      )}
      <div className="mt-1 flex items-center gap-8 font-display text-[34px] font-semibold uppercase">
        {h.owner && <span data-testid="owner" className="flex min-w-0 items-center gap-3"><Badge letter="O" />{h.owner}</span>}
        {h.trainer && <span data-testid="trainer" className="flex min-w-0 items-center gap-3"><Badge letter="T" />{h.trainer}</span>}
      </div>
    </div>
  );
}

function Fact({ i, label, testId, children }: { i: number; label: string; testId: string; children: ReactNode }) {
  return (
    <motion.div {...rowMotion(i)} data-testid={testId}
      className="grid content-center gap-1 bg-[linear-gradient(90deg,var(--color-band)_70%,rgb(44_48_96/.4))] px-7 py-3 text-white">
      <span className="font-display text-[24px] font-bold tracking-[.08em] text-yellow">{label}</span>
      <span className="flex min-w-0 items-center gap-4 font-display text-[44px] leading-[1.1] font-bold uppercase">{children}</span>
    </motion.div>
  );
}

function Profile({ h }: { h: Horse }) {
  const d = useData();
  const sk = silksKey(h.id);
  const silks = useImage(sk, d.images[sk]);
  const money = earningsIn(h, d.horseSettings);
  const coat = h.coat ? COATS[h.coat] : null;
  const dash = <span className="text-white/50">–</span>;
  const place = (c: string) => (c ? <><Flag code={c} className="h-[34px] w-[51px]" /><FitText>{countryName(c)}</FitText></> : dash);
  return (
    <div data-testid="horse-profile" className="grid grid-cols-2 gap-x-4 gap-y-3" style={{ gridAutoRows: 128 }}>
      <Fact i={0} label="FOALED" testId="fact-foaled">{h.foaled ? dotDate(h.foaled) : dash}</Fact>
      <Fact i={1} label="COLOR" testId="fact-coat">
        {coat ? <><span className="size-[40px] flex-none rounded-[4px] shadow-[0_0_0_3px_#fff]" style={{ background: coat.color }} /><FitText>{h.coat}</FitText></> : dash}
      </Fact>
      <Fact i={2} label="BORN IN" testId="fact-born">{place(h.bornIn)}</Fact>
      <Fact i={3} label="TRAINED IN" testId="fact-trained">{place(h.trainedIn)}</Fact>
      <Fact i={4} label="OWNER" testId="fact-owner">
        {/* the uploaded picture (PNG or SVG) or else the silks drawn by the app, whole on a light tile */}
        {(silks || h.silks) && (
          <span data-testid="silks" className="grid h-[72px] w-[116px] flex-none place-items-center overflow-hidden rounded-[8px] bg-white p-1 shadow-[0_0_0_3px_rgb(255_255_255/.35)]">
            {silks ? <img src={silks} alt="" className="h-full w-full object-contain" /> : <SilksSvg silks={h.silks!} className="h-full w-full" />}
          </span>
        )}
        {h.owner ? <FitText>{h.owner}</FitText> : dash}
      </Fact>
      <Fact i={5} label="TRAINER" testId="fact-trainer">{h.trainer ? <FitText>{h.trainer}</FitText> : dash}</Fact>
      <Fact i={6} label="RECORD" testId="fact-record">{recordText(h.record)}</Fact>
      <Fact i={7} label="EARNINGS" testId="fact-earnings">
        {money ? <FitText>{money.converted && <span className="text-white/60">≈ </span>}{moneyText(money.amount, money.currency)}</FitText> : dash}
      </Fact>
    </div>
  );
}

const COLS = "minmax(0,1.75fr) minmax(0,1.05fr) 82px 128px 150px minmax(0,1.2fr)";
const td = cx(cell, "overflow-hidden whitespace-nowrap bg-band px-4 font-display text-[34px] font-semibold");

function CareerRow({ r, i }: { r: CareerRace; i: number }) {
  const dim = r.outcome != null;
  const winner = r.other ? (r.finish === 1 ? `(${r.other})` : r.other) : "";
  return (
    <motion.div {...rowMotion(i, dim)} data-testid="career-row" className="grid items-center gap-2 py-1 text-white" style={{ height: ROW_H, gridTemplateColumns: COLS }}>
      <span className={cx(cell, "grid content-center gap-0.5 overflow-hidden bg-[linear-gradient(90deg,var(--color-band)_80%,rgb(44_48_96/.35))] px-5")}>
        <span className="flex min-w-0 items-center gap-3 font-display text-[34px] leading-none font-bold uppercase">
          <FitText grow={false}>{r.name}</FitText>
          {r.grade && <span data-testid="career-grade" className={cx(pill, "h-[30px] flex-none px-3 text-[22px] text-white")} style={{ background: gradeColor(r.grade) }}>{r.grade}</span>}
        </span>
        <span className="font-display text-[22px] leading-none font-semibold tracking-[.04em] text-white/70">{dotDate(r.date)}</span>
      </span>
      <span className={cx(cell, "grid content-center gap-0.5 overflow-hidden bg-band px-4 uppercase")}>
        <FitText className="font-display text-[30px] leading-none font-bold">{r.course || "–"}</FitText>
        <span className="font-display text-[22px] leading-none font-semibold text-white/70">{[r.surface, r.distanceM ? `${r.distanceM}m` : ""].filter(Boolean).join(" ")}</span>
      </span>
      <span className={cx(td, "justify-center")}>{r.fav ?? "–"}</span>
      <span data-testid="career-pos" className={cx(td, "justify-center font-bold", r.finish === 1 && "bg-yellow text-navy")}>{posText(r)}</span>
      <span className={cx(td, "justify-center")}>{r.time || "–"}</span>
      <span data-testid="career-winner" className={cx(td, "uppercase")}><FitText>{winner || "–"}</FitText></span>
    </motion.div>
  );
}

function Career({ h, page }: { h: Horse; page: number }) {
  const rows = careerPage(h, page);
  return (
    <div data-testid="horse-career" className="grid content-start">
      <div className={headClass} style={{ gridTemplateColumns: COLS }}>
        <span className={headLeft}>RACE</span><span className="px-4 text-left">COURSE</span><span>FAV</span><span>POS</span><span>TIME</span><span className="px-4 text-left">WINNER (2ND)</span>
      </div>
      {rows.map((r, i) => <CareerRow key={`${r.date}${r.name}${i}`} r={r} i={i} />)}
      {/* keep the table the same height on a short last page */}
      {rows.length < CAREER_ROWS && <div style={{ height: (CAREER_ROWS - rows.length) * ROW_H }} />}
    </div>
  );
}

export function HorseScene({ horse: h }: { horse: Horse }) {
  const { page, count } = useHorsePage(h);
  return (
    <div className="absolute inset-0 overflow-hidden bg-scene" data-testid="horse" data-horse={h.id} data-page={page + 1}>
      <HorsePhoto h={h} />
      <Header h={h} />
      <div className="absolute" style={{ left: LEFT, top: CONTENT_TOP, width: W }}>
        <AnimatePresence initial={false} mode="popLayout">
          <motion.div key={page} exit={{ opacity: 1 }} transition={{ duration: 0.4 }}>
            {page === 0 ? <Profile h={h} /> : <Career h={h} page={page} />}
          </motion.div>
        </AnimatePresence>
      </div>
      <PageCount page={page} count={count} />
    </div>
  );
}
