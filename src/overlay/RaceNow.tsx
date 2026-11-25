/**
 * "Race Now": the race being run and every runner's name (up to 18 in 3 columns of 6), with its status:
 * waiting = a countdown to the post time ("SOON" once it is reached or when there is no post time), LIVE or FINISHED.
 * It sits in a box made for the middle band of the screen (between the race video above and below).
 * With no race picked the box shows the logo and the clock (Thai time) only. `hidden` takes it all off the screen;
 * highlighted runners turn yellow and the others dim.
 * It lives on its own Browser Source (#/race-now) and is run from the dock's overview tab.
 */
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CLASSES, RACE_NOW_H, RACE_NOW_W, type Race, type RaceNow as RN, type RaceNowStatus, type RaceNowTz } from "../lib/model";
import { boxColors, boxExtra, GRADE_COLOR } from "../lib/colors";
import { gradeLabel } from "../lib/labels";
import { useData } from "../lib/store";
import { cx } from "../lib/cx";
import { FitText } from "../components/FitText";
import { Logo } from "../components/Logo";
import { BgVideo } from "../components/BgVideo";

const EASE = [0.65, 0, 0.35, 1] as const;
const LEFT_W = 540;
const ROWS = 6;
/** UTC offset of the time zone the post times are written in. */
const OFFSET: Record<RaceNowTz, string> = { th: "+07:00", jp: "+09:00" };

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

/** "14:05:09" and "SAT 22 NOV" in Thai time. */
export function clockText(now: Date) {
  const zone = "Asia/Bangkok";
  const time = new Intl.DateTimeFormat("en-GB", { timeZone: zone, hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).format(now);
  const date = new Intl.DateTimeFormat("en-GB", { timeZone: zone, weekday: "short", day: "numeric", month: "short" }).format(now).replace(",", "").toUpperCase();
  return { time, date };
}

/** The race's post time as a moment, from its date and "15:40" written in time zone `tz`; null without a post time. */
export function postAt(race: Pick<Race, "date" | "postTime">, tz: RaceNowTz): Date | null {
  const m = /^(\d{1,2})[:.](\d{2})$/.exec(race.postTime.trim());
  if (!m || +m[1] > 23 || +m[2] > 59) return null;
  return new Date(`${race.date}T${m[1].padStart(2, "0")}:${m[2]}:00${OFFSET[tz]}`);
}

/** What the waiting race shows: "12:05" / "1:02:03" until the post time, then "SOON" (also with no post time). */
export function countdownText(post: Date | null, now: Date): string {
  if (!post) return "SOON";
  const left = Math.ceil((post.getTime() - now.getTime()) / 1000);
  if (left <= 0) return "SOON";
  const h = Math.floor(left / 3600), m = Math.floor((left % 3600) / 60), sec = left % 60;
  const two = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${two(m)}:${two(sec)}` : `${two(m)}:${two(sec)}`;
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

function Clock() {
  const { time, date } = clockText(useNow());
  return (
    <div className="grid justify-items-start gap-2 font-display leading-none" data-testid="race-now-clock">
      <span className="text-[150px] font-bold tabular-nums text-white" data-testid="race-now-time">{time}</span>
      <span className="text-[38px] font-semibold tracking-[.06em] text-home-date">{date}</span>
    </div>
  );
}

/** Bottom-left of the race panel: the countdown (or SOON), LIVE or FINISHED. */
function Status({ race, status, tz }: { race: Race; status: RaceNowStatus; tz: RaceNowTz }) {
  const now = useNow();
  const post = postAt(race, tz);
  const text = status === "live" ? "LIVE" : status === "finished" ? "FINISHED" : countdownText(post, now);
  const caption = status === "live" ? "RACE IN PROGRESS" : status === "finished" ? "RESULT COMING UP" : text === "SOON" ? "STARTING" : "STARTS IN";
  return (
    <div className="grid justify-items-start gap-2 font-display leading-none" data-testid="race-now-status" data-status={status}>
      <span className="flex items-center gap-3 text-[28px] font-semibold tracking-[.08em] text-home-date">
        {caption}
        {status === "waiting" && race.postTime && <span className="bg-white/12 px-2 py-0.5 text-white">POST {race.postTime}</span>}
      </span>
      <span data-testid="race-now-count" className={cx("flex items-center gap-4 font-bold tabular-nums",
        status === "live" ? "text-[96px] text-white" : status === "finished" ? "text-[80px] text-home-date" : text === "SOON" ? "text-[96px] text-yellow" : "text-[104px] text-white")}>
        {status === "live" && <span aria-hidden="true" className="size-8 animate-pulse rounded-full bg-[#E23B24]" />}
        {text}
      </span>
    </div>
  );
}

const pill = "inline-flex h-[44px] flex-none items-center rounded-full px-5 text-[30px] font-bold leading-none text-white";

function RacePanel({ race, status, tz, highlight }: { race: Race; status: RaceNowStatus; tz: RaceNowTz; highlight: number[] }) {
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
      {/* the สนทนาม้าซิ่ง tile video behind the whole box */}
      <BgVideo className="-z-10" />
      {/* left: RACE NOW, the race, the clock */}
      <div className="flex min-w-0 flex-col px-9 pt-8 pb-7">
        <span className="flex w-max items-center gap-3 bg-yellow px-4 py-1.5 text-[34px] leading-none font-extrabold tracking-[.08em] text-navy">
          <span className={cx("size-4 rounded-full bg-[#E23B24]", status === "live" && "animate-pulse")} aria-hidden="true" />RACE NOW
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
        <div className="mt-auto"><Status race={race} status={status} tz={tz} /></div>
      </div>
      {/* right: every runner, top to bottom then the next column */}
      <div data-testid="race-now-runners" className="grid gap-x-4 gap-y-2 bg-navy/45 p-5"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))`, gridTemplateRows: `repeat(${rows}, minmax(0,1fr))`, gridAutoFlow: "column" }}>
        {race.runners.map((h, i) => {
          const colors = boxColors(S.numberScheme, h.number, h.number, n, S, true);
          const hl = highlight.includes(h.number);
          const dim = h.scratched || (highlight.length > 0 && !hl);
          return (
            <motion.div key={h.number} data-no={h.number} data-scratched={h.scratched || undefined} data-hl={hl ? "on" : undefined}
              className="grid min-w-0 items-stretch" style={{ gridTemplateColumns: "76px minmax(0,1fr)" }}
              initial={{ opacity: 0, x: 40 }} animate={{ opacity: dim ? 0.45 : 1, x: 0, transition: { duration: 0.3, ease: EASE, delay: 0.35 + i * 0.03 } }}>
              <span className={cx("flex items-center justify-center text-[44px] leading-none font-bold", !colors && "bg-scene shadow-[inset_0_0_0_3px_#fff]")}
                style={colors ? { background: colors[0], color: colors[1], ...boxExtra(colors) } : undefined}>{h.number}</span>
              <span className={cx("flex min-w-0 items-center gap-3 px-4 transition-colors duration-300", hl ? "bg-yellow text-navy" : "bg-band")}>
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
function IdlePanel() {
  return (
    <motion.div data-testid="race-now-idle" className="absolute inset-0 flex items-center justify-center gap-24"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.45, ease: EASE }}>
      <BgVideo className="-z-10" />
      <Logo className="w-[560px]" />
      <span aria-hidden="true" className="h-[300px] w-[4px] bg-yellow" />
      <Clock />
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
        {rn.hidden ? null : race
          ? <RacePanel key={race.id} race={race} status={rn.status} tz={rn.tz} highlight={rn.highlight} />
          : <IdlePanel key="idle" />}
      </AnimatePresence>
    </div>
  );
}
