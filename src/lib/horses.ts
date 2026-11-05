/**
 * Horse profiles: the "ม้า" tab of the dock and the horse scene on screen. A horse has its facts
 * (pedigree, connections, record, prize money) and its past races; page 1 of the scene shows the facts,
 * the next pages its races, newest first. Pictures (the horse, the owner's silks) live in IndexedDB.
 */
export * from "./horseSchema.ts";
import { CURRENCIES, type CareerRace, type Currency, type Horse, type HorseSettings, type HorseView } from "./horseSchema.ts";
import { cycleAt, cycleSet, cycleTo, useCycle } from "./cycle";
import { paginate } from "./paging";

/** Picture keys in IndexedDB. */
export const horsePhotoKey = (id: string) => `horse:${id}`;
export const silksKey = (id: string) => `silks:${id}`;

/** Past races per page of the scene. */
export const CAREER_ROWS = 7;

/** Races newest first. */
export const careerNewestFirst = (h: Pick<Horse, "races">) => [...h.races].sort((a, b) => b.date.localeCompare(a.date));

/** Pages of the scene: the profile, then the races CAREER_ROWS at a time. */
export const horsePages = (h: Pick<Horse, "races">) => 1 + Math.ceil(h.races.length / CAREER_ROWS);

/** The races on page `page` (page 0 is the profile: no races). */
export function careerPage(h: Pick<Horse, "races">, page: number) {
  return page < 1 ? [] : paginate(careerNewestFirst(h), CAREER_ROWS, page - 1).rows;
}

const asCycle = (h: Pick<Horse, "view">) => ({ ...h.view, index: h.view.page });
export const shownHorsePage = (h: Pick<Horse, "view" | "races">, now = Date.now()) => cycleAt(asCycle(h), horsePages(h), now);
export function showHorsePage(h: Pick<Horse, "view" | "races">, i: number, now = Date.now()): HorseView {
  const c = cycleTo(asCycle(h), i, horsePages(h), now);
  return { ...h.view, page: c.index, since: c.since };
}
export function setHorseAuto(h: Pick<Horse, "view" | "races">, patch: Partial<Pick<HorseView, "auto" | "seconds">>, now = Date.now()): HorseView {
  const { index, auto, seconds, since } = cycleSet(asCycle(h), patch, horsePages(h), now);
  return { ...h.view, page: index, auto, seconds, since };
}
/** The page on screen, re-rendering when auto turns it. */
export function useHorsePage(h: Pick<Horse, "view" | "races">) {
  const count = horsePages(h);
  return { page: Math.max(0, useCycle(asCycle(h), count)), count };
}

/** "12 (5-3-1-3)": starts, then 1st-2nd-3rd-unplaced. */
export function recordText(r: Horse["record"]): string {
  const rest = Math.max(0, r.starts - r.first - r.second - r.third);
  return `${r.starts} (${r.first}-${r.second}-${r.third}-${rest})`;
}

/** The record counted from the past races entered. */
export function recordFromRaces(h: Pick<Horse, "races">): Horse["record"] {
  const n = (p: number) => h.races.filter((r) => r.finish === p).length;
  return { starts: h.races.length, first: n(1), second: n(2), third: n(3) };
}

export const rateOf = (s: HorseSettings, c: Currency) => s.rates[c] ?? CURRENCIES[c].usd;

/** Prize money in the chosen currency (converted with the rates when it is not the horse's own). */
export function earningsIn(h: Pick<Horse, "earnings" | "currency">, s: HorseSettings): { amount: number; currency: Currency; converted: boolean } | null {
  if (h.earnings == null) return null;
  const to = s.currency === "own" ? h.currency : s.currency;
  if (to === h.currency) return { amount: h.earnings, currency: to, converted: false };
  return { amount: (h.earnings * rateOf(s, h.currency)) / rateOf(s, to), currency: to, converted: true };
}

export function moneyText(amount: number, c: Currency): string {
  return CURRENCIES[c].symbol + Math.round(amount).toLocaleString("en-US");
}

/** "2022.03.14" */
export const dotDate = (d: string) => d.replaceAll("-", ".");

/** POS cell of a past race: "1 / 18", "DNF", "DQ". */
export function posText(r: CareerRace): string {
  if (r.outcome) return r.outcome.toUpperCase();
  if (r.finish == null) return "–";
  return r.field ? `${r.finish}/${r.field}` : String(r.finish);
}
