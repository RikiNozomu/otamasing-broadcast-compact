/**
 * "Race Now": the race being run and every runner's name (up to 18 in 3 columns of 6), with the clock,
 * in a box made for the middle band of the screen (between the race video above and below).
 * With no race picked the box shows the logo and the clock only.
 * It lives on its own Browser Source (#/race-now) and is run from the dock's overview tab.
 */
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CLASSES, RACE_NOW_H, RACE_NOW_W, type Race, type RaceNow as RN, type RaceNowTz } from "../lib/model";
import { boxColors, GRADE_COLOR } from "../lib/colors";
import { gradeLabel } from "../lib/labels";
import { useData } from "../lib/store";
import { cx } from "../lib/cx";
import { FitText } from "../components/FitText";
import { Logo } from "../components/Logo";

const EASE = [0.65, 0, 0.35, 1] as const;
const LEFT_W = 540;
const ROWS = 6;
const TZ: Record<RaceNowTz, { zone: string; label: string }> = {
  th: { zone: "Asia/Bangkok", label: "THAI TIME" },
  jp: { zone: "Asia/Tokyo", label: "JAPAN TIME" },
};

/** Top-left corner of the box on the 1920x1080 stage, from the x/y percentages of the free room. */
export function raceNowBox(rn: Pick<RN, "x" | "y" | "scale">) {
  const w = RACE_NOW_W * rn.scale, h = RACE_NOW_H * rn.scale;
  return { left: ((1920 - w) * rn.x) / 100, top: ((1080 - h) * rn.y) / 100, w, h };
}

/** The race the box shows, or null (none picked, or the race is gone). */
export const raceNowRace = (races: Race[], rn: Pick<RN, "raceId">): Race | null => races.find((r) => r.id === rn.raceId) ?? null;

/** How many columns the names take: 1 up to 6 runners, 2 up to 12, else 3 (rows fill top to bottom first). */
export function raceNowColumns(n: number): number {
  return n <= ROWS ? 1 : n <= ROWS * 2 ? 2 : 3;
}

/** "14:05:09" and "SAT 22 NOV" in the given time zone. */
export function clockText(now: Date, tz: RaceNowTz) {
  const zone = TZ[tz].zone;
  const time = new Intl.DateTimeFormat("en-GB", { timeZone: zone, hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).format(now);
  const date = new Intl.DateTimeFormat("en-GB", { timeZone: zone, weekday: "short", day: "numeric", month: "short" }).format(now).replace(",", "").toUpperCase();
  return { time, date };
}

function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    // tick on the second, so the seconds change together with the system clock
    let t: ReturnType<typeof setTimeout>;
    const tick = () => { setNow(new Date()); t = setTimeout(tick, 1000 - (Date.now() % 1000) + 5); };
    t = setTimeout(tick, 1000 - (Date.now() % 1000) + 5);
    return () => clearTimeout(t);
  }, []);
  return now;
}

function Clock({ tz, big }: { tz: RaceNowTz; big?: boolean }) {
  const { time, date } = clockText(useNow(), tz);
  return (
    <div className="grid justify-items-start gap-1 font-display leading-none" data-testid="race-now-clock">
      <span className={cx("font-bold tabular-nums text-white", big ? "text-[150px]" : "text-[104px]")} data-testid="race-now-time">{time}</span>
      <span className={cx("flex items-center gap-3 font-semibold tracking-[.06em] text-home-date", big ? "text-[34px]" : "text-[28px]")}>
        <span className="bg-yellow px-2.5 py-1 text-navy">{TZ[tz].label}</span>
        <span>{date}</span>
      </span>
    </div>
  );
}

const pill = "inline-flex h-[44px] flex-none items-center rounded-full px-5 text-[30px] font-bold leading-none text-white";

function RacePanel({ race, tz }: { race: Race; tz: RaceNowTz }) {
  const S = race.style;
  const n = race.runners.length;
  const cols = raceNowColumns(n);
  const rows = Math.min(ROWS, Math.ceil(n / cols));
  const cls = race.class ? CLASSES[race.class] : null;
  const facts = [race.round, race.course, [race.surface, race.distanceM ? `${race.distanceM}m` : ""].filter(Boolean).join(" ")].filter(Boolean);
  const nameSize = cols === 3 ? 40 : cols === 2 ? 46 : 52;
  return (
    <motion.div data-testid="race-now" data-race={race.id} className="absolute inset-0 grid font-display text-white" style={{ gridTemplateColumns: `${LEFT_W}px minmax(0,1fr)` }}
      initial={{ clipPath: "inset(0 100% 0 0)" }} animate={{ clipPath: "inset(0 0% 0 0)" }} exit={{ clipPath: "inset(0 0 0 100%)" }} transition={{ duration: 0.6, ease: EASE }}>
      {/* left: RACE NOW, the race, the clock */}
      <div className="flex min-w-0 flex-col bg-scene px-9 pt-8 pb-7">
        <span className="flex w-max items-center gap-3 bg-yellow px-4 py-1.5 text-[34px] leading-none font-extrabold tracking-[.08em] text-navy">
          <span className="size-4 animate-pulse rounded-full bg-[#E23B24]" aria-hidden="true" />RACE NOW
        </span>
        <div className="mt-5 flex min-w-0 items-center">
          <FitText className="text-[64px] leading-[1.05] font-bold uppercase"><span data-testid="race-now-name">{race.name}</span></FitText>
        </div>
        <div className="mt-2 flex items-center gap-3">
          {S.show.grade && race.grade && <span data-testid="race-now-grade" className={pill} style={{ background: GRADE_COLOR[race.grade] }}>{gradeLabel(race, S)}</span>}
          {S.show.class && cls && <span className={pill} style={{ background: cls.color }}>{cls.label}</span>}
          <span data-testid="race-now-facts" className="min-w-0 truncate text-[32px] font-semibold tracking-[.02em] uppercase">
            {facts.map((f, i) => <span key={i}>{i > 0 && <span className="px-2 text-white/55">·</span>}{f}</span>)}
          </span>
        </div>
        <div className="mt-auto"><Clock tz={tz} /></div>
      </div>
      {/* right: every runner, top to bottom then the next column */}
      <div data-testid="race-now-runners" className="grid gap-x-4 gap-y-2 bg-navy p-5"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))`, gridTemplateRows: `repeat(${rows}, minmax(0,1fr))`, gridAutoFlow: "column" }}>
        {race.runners.map((h, i) => {
          const colors = boxColors(S.numberScheme, h.number, h.number, n, S, true);
          return (
            <motion.div key={h.number} data-no={h.number} data-scratched={h.scratched || undefined}
              className={cx("grid min-w-0 items-stretch bg-band", h.scratched && "opacity-45")} style={{ gridTemplateColumns: "76px minmax(0,1fr)" }}
              initial={{ opacity: 0, x: 40 }} animate={{ opacity: h.scratched ? 0.45 : 1, x: 0 }} transition={{ duration: 0.3, ease: EASE, delay: 0.35 + i * 0.03 }}>
              <span className={cx("flex items-center justify-center text-[44px] leading-none font-bold", !colors && "bg-scene shadow-[inset_0_0_0_3px_#fff]")}
                style={colors ? { background: colors[0], color: colors[1] } : undefined}>{h.number}</span>
              <span className="flex min-w-0 items-center gap-3 px-4">
                <FitText strike={h.scratched} className="leading-none font-bold" ><span style={{ fontSize: nameSize }}>{h.name.toUpperCase()}</span></FitText>
                {h.scratched && <span className="flex-none text-[24px] font-bold text-danger-ink">SCR</span>}
              </span>
            </motion.div>
          );
        })}
      </div>
      <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[6px] bg-yellow" />
    </motion.div>
  );
}

/** No race picked: the logo and the clock, nothing else. */
function IdlePanel({ tz }: { tz: RaceNowTz }) {
  return (
    <motion.div data-testid="race-now-idle" className="absolute inset-0 flex items-center justify-center gap-24 bg-navy"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.45, ease: EASE }}>
      <Logo className="w-[560px]" />
      <span aria-hidden="true" className="h-[300px] w-[4px] bg-yellow" />
      <Clock tz={tz} big />
      <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[6px] bg-yellow" />
    </motion.div>
  );
}

/** The Race Now box at its place on the 1920x1080 stage. */
export function RaceNow() {
  const d = useData();
  const rn = d.raceNow;
  const race = raceNowRace(d.races, rn);
  const box = raceNowBox(rn);
  return (
    <div className="pointer-events-none absolute z-10 origin-top-left overflow-hidden" data-testid="race-now-box"
      style={{ left: box.left, top: box.top, width: RACE_NOW_W, height: RACE_NOW_H, transform: `scale(${rn.scale})` }}>
      <AnimatePresence initial={false} mode="wait">
        {race ? <RacePanel key={race.id} race={race} tz={rn.tz} /> : <IdlePanel key="idle" tz={rn.tz} />}
      </AnimatePresence>
    </div>
  );
}
