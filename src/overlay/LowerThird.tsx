/**
 * The lower third: one runner's plate laid over the live race video, on top of whatever scene is Active
 * (it lives outside the scene layers, so a scene change never touches it).
 * Top line: number box, horse (flag + name), body weight with its change. Bottom line: jockey and weight carried.
 * Every cell is opaque, so the live video never shows through the text.
 * It wipes in left to right behind a yellow edge and wipes out the same way; changing horse swaps the plate.
 */
import { AnimatePresence, motion } from "motion/react";
import { LOWER_THIRD_H, LOWER_THIRD_W, type LowerThird as LT, type Race, type Runner } from "../lib/model";
import { boxColors } from "../lib/colors";
import { useData } from "../lib/store";
import { cx } from "../lib/cx";
import { Flag } from "../components/Flag";
import { FitText } from "../components/FitText";

const EASE = [0.65, 0, 0.35, 1] as const;
const TOP_H = 92;
const BOX_W = 130;
const SIDE_W = 330;
/** "+4", "±0", "-2" (with a real minus sign) */
export const signedChange = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${-n}` : "±0");

/** Top-left corner of the plate on the 1920x1080 stage, from the x/y percentages of the free room. */
export function lowerThirdBox(lt: Pick<LT, "x" | "y" | "scale">) {
  const w = LOWER_THIRD_W * lt.scale, h = LOWER_THIRD_H * lt.scale;
  return { left: ((1920 - w) * lt.x) / 100, top: ((1080 - h) * lt.y) / 100, w, h };
}

/** The runner the lower third shows, or null when it is hidden (or the horse is gone / scratched). */
export function lowerThirdRunner(races: Race[], lt: LT): { race: Race; runner: Runner } | null {
  if (lt.number == null) return null;
  const race = races.find((r) => r.id === lt.raceId);
  const runner = race?.runners.find((h) => h.number === lt.number);
  return race && runner && !runner.scratched ? { race, runner } : null;
}

function Plate({ race, runner }: { race: Race; runner: Runner }) {
  const S = race.style;
  const colors = boxColors(S.numberScheme, runner.number, runner.number, race.runners.length, S, true);
  const hasBody = runner.horseWeight != null;
  return (
    <motion.div data-testid="lower-third" data-no={runner.number} className="absolute inset-0 grid font-display text-white"
      style={{ gridTemplateColumns: `${BOX_W}px minmax(0,1fr) ${SIDE_W}px`, gridTemplateRows: `${TOP_H}px 1fr` }}
      initial={{ clipPath: "inset(0 100% 0 0)" }} animate={{ clipPath: "inset(0 0% 0 0)" }} exit={{ clipPath: "inset(0 0 0 100%)" }}
      transition={{ duration: 0.55, ease: EASE }}>
      {/* number box, both lines tall */}
      <span className={cx("row-span-2 flex items-center justify-center text-[84px] leading-none font-bold", !colors && "bg-scene shadow-[inset_0_0_0_4px_#fff]")}
        style={colors ? { background: colors[0], color: colors[1] } : undefined}>{runner.number}</span>
      {/* horse */}
      <span className="flex min-w-0 items-center gap-4 bg-navy px-6">
        {S.show.horseFlag && <Flag code={runner.horseCountry} className="h-[34px] w-[51px]" />}
        <FitText className="text-[60px] leading-none font-bold">
          <span data-testid="lt-horse">{runner.name.toUpperCase()}</span>
        </FitText>
      </span>
      {/* body weight and its change */}
      <span data-testid="lt-body" className="flex items-baseline justify-end gap-2 bg-scene px-6 pt-[22px] leading-none font-bold">
        {hasBody && <>
          <span className="text-[60px]">{runner.horseWeight}</span>
          <span className="text-[30px] font-medium text-home-date">kg</span>
          {runner.horseWeightChange != null && <span data-testid="lt-change" className="ml-3 text-[48px] text-yellow">{signedChange(runner.horseWeightChange)}</span>}
        </>}
      </span>
      {/* jockey */}
      <span className="flex min-w-0 items-center gap-3.5 bg-[#2C3060] px-6">
        {S.show.jockeyFlag && <Flag code={runner.jockeyCountry} className="h-[24px] w-[36px]" />}
        <FitText className="text-[36px] leading-none font-medium">
          <span data-testid="lt-jockey">{runner.jockey.toUpperCase()}</span>
        </FitText>
      </span>
      {/* weight carried */}
      <span data-testid="lt-weight" className="flex items-center justify-end gap-2 bg-[#2C3060] px-6 leading-none font-bold">
        {runner.weight != null && <>
          <span className="text-[38px]">{runner.weight.toFixed(1)}</span>
          <span className="text-[24px] font-medium text-home-date">kg</span>
        </>}
      </span>
      {/* the yellow edge on top, drawn last so it sits over every cell */}
      <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[6px] bg-yellow" />
    </motion.div>
  );
}

/** Text with a dark outline under the fill and a soft drop shadow, as on the TV graphic. */
const tvText = "[paint-order:stroke_fill] [-webkit-text-stroke:7px_#1b1b1b] [text-shadow:3px_4px_0_rgb(0_0_0/.55)]";
const TV_TOP = 92;
const TV_BOX = 120;
const TV_SIDE = 400;
const SLANT = 34;
/** Weight carried as the TV writes it: 53, 57.5 */
const carried = (w: number) => (Number.isInteger(w) ? String(w) : w.toFixed(1));

/**
 * The second look, laid out like the Japanese TV lower third: a see-through grey plate, a slanted number
 * box in the race's number colours, the name in big outlined white, body weight in pale yellow with the
 * change in pale blue on a dark slanted panel, and jockey + weight carried on the lighter line below.
 */
function TvPlate({ race, runner }: { race: Race; runner: Runner }) {
  const S = race.style;
  const colors = boxColors(S.numberScheme, runner.number, runner.number, race.runners.length, S, true) ?? (["#0A056B", "#FFFFFF"] as const);
  return (
    <motion.div data-testid="lower-third" data-look="tv" data-no={runner.number}
      className="absolute inset-0 font-display font-extrabold text-white"
      initial={{ clipPath: "inset(0 100% 0 0)" }} animate={{ clipPath: "inset(0 0% 0 0)" }} exit={{ clipPath: "inset(0 0 0 100%)" }}
      transition={{ duration: 0.55, ease: EASE }}>
      {/* the plate: darker see-through band on top, lighter grey one below, thin dark frame */}
      <div className="absolute inset-0 border-2 border-black/45 bg-[linear-gradient(180deg,rgb(40_44_40/.55)_0,rgb(40_44_40/.55)_61%,rgb(120_126_116/.62)_61%,rgb(120_126_116/.62)_100%)]" />
      {/* number box with a slanted right edge, coloured like the race's NO. boxes */}
      <span className={cx("absolute top-[8px] left-[8px] flex items-center justify-center pr-[22px] text-[72px] leading-none", tvText)}
        style={{ width: TV_BOX + SLANT, height: TV_TOP - 16, background: colors[0], color: colors[1], clipPath: `polygon(0 0, 100% 0, calc(100% - ${SLANT}px) 100%, 0 100%)` }}>
        {runner.number}
      </span>
      {/* horse */}
      <span className="absolute top-0 flex items-center" style={{ left: TV_BOX + SLANT + 20, right: TV_SIDE + 10, height: TV_TOP }}>
        <FitText className={cx("text-[72px] leading-[1.15]", tvText)}><span data-testid="lt-horse">{runner.name}</span></FitText>
      </span>
      {/* body weight and change on a dark slanted panel */}
      <span data-testid="lt-body" className="absolute top-0 right-0 flex items-center gap-1 pr-6 pl-[60px] leading-none"
        style={{ width: TV_SIDE, height: TV_TOP, background: "rgb(20 22 20 / .82)", clipPath: `polygon(${SLANT}px 0, 100% 0, 100% 100%, 0 100%)` }}>
        {runner.horseWeight != null && <>
          <span className={cx("text-[68px] text-[#FFF6B8]", tvText)}>{runner.horseWeight}</span>
          <span className={cx("text-[36px] text-[#FFF6B8]", tvText)}>kg</span>
          {runner.horseWeightChange != null && <span data-testid="lt-change" className={cx("ml-7 text-[58px] text-[#C9DCFF]", tvText)}>{signedChange(runner.horseWeightChange)}</span>}
        </>}
      </span>
      {/* jockey */}
      <span className="absolute bottom-0 flex items-center" style={{ left: TV_BOX + SLANT + 20, right: TV_SIDE + 10, top: TV_TOP }}>
        <FitText className={cx("text-[44px] leading-[1.15] font-bold", tvText)}><span data-testid="lt-jockey">{runner.jockey}</span></FitText>
      </span>
      {/* weight carried, under the start of the body weight panel */}
      <span data-testid="lt-weight" className={cx("absolute bottom-0 flex items-center text-[46px] leading-none font-bold", tvText)} style={{ left: LOWER_THIRD_W - TV_SIDE + 60, top: TV_TOP }}>
        {runner.weight != null && carried(runner.weight)}
      </span>
    </motion.div>
  );
}

/** The lower third at its place on the 1920x1080 stage. */
export function LowerThird() {
  const d = useData();
  const lt = d.lowerThird;
  const shown = lowerThirdRunner(d.races, lt);
  const box = lowerThirdBox(lt);
  return (
    <div className="pointer-events-none absolute z-20 origin-top-left" data-testid="lower-third-box"
      style={{ left: box.left, top: box.top, width: LOWER_THIRD_W, height: LOWER_THIRD_H, transform: `scale(${lt.scale})` }}>
      <AnimatePresence initial={false} mode="wait">
        {shown && (lt.look === "tv"
          ? <TvPlate key={`tv:${shown.race.id}:${shown.runner.number}`} race={shown.race} runner={shown.runner} />
          : <Plate key={`${shown.race.id}:${shown.runner.number}`} race={shown.race} runner={shown.runner} />)}
      </AnimatePresence>
    </div>
  );
}
