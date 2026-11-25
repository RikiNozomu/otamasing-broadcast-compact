/**
 * What the compact racecard and result page share (1920x1080): the สนทนาม้าซิ่ง tile video full screen, the logo top right, the race title on top (name with its grade and class badges, then
 * date · round · course · distance) and the page number bottom right.
 */
import { useLayoutEffect, useRef, type ReactNode } from "react";
import { CLASSES, type Race } from "../lib/model";
import { GRADE_COLOR } from "../lib/colors";
import { gradeLabel } from "../lib/labels";
import { cx } from "../lib/cx";
import { Logo } from "../components/Logo";
import { BgVideo } from "../components/BgVideo";
import { WeatherLogo } from "../components/WeatherLogo";

export const pill = "inline-flex items-center justify-center whitespace-nowrap rounded-full font-display font-bold leading-none [text-shadow:none]";

/** Left and right margin of the title and the table. */
export const SIDE = 60;
/** Width of the table: the whole screen less the margins. */
export const TABLE_W = 1920 - 2 * SIDE;
/** Where the table starts (its header). */
export const TABLE_TOP = 262;

/** The scene's background: the สนทนาม้าซิ่ง tile video full screen, and the logo top right. */
export function RaceBackground() {
  return (
    <>
      <BgVideo />
      <Logo className="absolute top-[34px] right-[60px] w-48" />
    </>
  );
}

/**
 * The title on top: the race name with the grade and class badges right after it (the name shrinks until
 * the line fits beside the logo), then date · round · course · distance and the weather logo. `tag` goes before those facts (e.g. RESULT).
 */
export function RaceTitle({ race, tag }: { race: Race; tag?: ReactNode }) {
  const S = race.style, show = S.show;
  const lineRef = useRef<HTMLDivElement>(null);
  const nameRef = useRef<HTMLDivElement>(null);
  const maxWidth = 1920 - SIDE - SIDE - 160 - 50; // up to the logo
  const cls = race.class ? CLASSES[race.class] : null;
  const showGrade = !!(show.grade && race.grade), showClass = !!(show.class && cls);
  useLayoutEffect(() => {
    const line = lineRef.current, name = nameRef.current;
    if (!line || !name) return;
    let s = 104;
    name.style.fontSize = s + "px";
    while (line.scrollWidth > maxWidth && s > 48) { s -= 4; name.style.fontSize = s + "px"; }
  }, [race.name, showGrade, showClass, race.grade, race.class, maxWidth]);
  const distance = [race.surface, race.distanceM ? `${race.distanceM} meters` : ""].filter(Boolean).join(" ");
  const facts = [race.date.replaceAll("-", "."), race.round, race.course, distance].filter(Boolean);
  return (
    <div className="absolute grid gap-1.5 text-white [text-shadow:0_2px_14px_rgb(0_0_0/.45)]" style={{ left: SIDE, top: 40 }}>
      <div ref={lineRef} data-testid="title-line" className="flex w-max items-center gap-5">
        <div ref={nameRef} data-testid="race-name" className="font-display text-[104px] leading-[.95] font-bold tracking-[-.005em] whitespace-nowrap uppercase">{race.name}</div>
        {showGrade && <span data-testid="grade" className={cx(pill, "h-[52px] flex-none px-6 text-[36px] text-white")} style={{ background: GRADE_COLOR[race.grade!] }}>{gradeLabel(race, S)}</span>}
        {showClass && <span data-testid="class" className={cx(pill, "h-[52px] flex-none px-6 text-[36px] text-white")} style={{ background: cls!.color }}>{cls!.label}</span>}
      </div>
      <div className="flex items-center gap-4">
        {tag}
        <div data-testid="race-facts" className="font-display text-[40px] leading-[1.2] font-semibold tracking-[.02em] uppercase">
          {facts.map((f, i) => <span key={i}>{i > 0 && <span className="px-3 text-white/55">·</span>}{f}</span>)}
        </div>
        {race.weather && <WeatherLogo kind={race.weather} testId="race-weather" className="size-[52px] [filter:drop-shadow(0_2px_6px_rgb(0_0_0/.35))]" />}
      </div>
    </div>
  );
}

/** "PAGE 1 / 2" bottom right while there is more than one page. */
export function PageCount({ page, count }: { page: number; count: number }) {
  if (count < 2) return null;
  return (
    <div data-testid="page-count" className="absolute bottom-[26px] flex items-center gap-2" style={{ right: SIDE }} aria-label={`หน้า ${page + 1} จาก ${count}`}>
      {Array.from({ length: count }, (_, i) => (
        <span key={i} className={cx("h-2.5 rounded-full transition-all duration-300", i === page ? "w-10 bg-yellow" : "w-2.5 bg-white/45")} />
      ))}
    </div>
  );
}
