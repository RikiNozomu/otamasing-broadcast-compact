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
        {shown && <Plate key={`${shown.race.id}:${shown.runner.number}`} race={shown.race} runner={shown.runner} />}
      </AnimatePresence>
    </div>
  );
}
