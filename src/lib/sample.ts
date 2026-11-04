/** Sample data written on first open, so every page shows something straight away. Names are made up. */
import { HOME, newPhotos, newCard, newResult, newStyle, type AppData, type Race, type Runner } from "./model";

const NAMES = ["Morning Gallop", "Silver Paddock", "Northern Lantern", "Checkered Flag", "Royal Furlong", "Paper Owner", "Gate Seven", "Blue Silks", "Final Furlong", "Yellow Draw", "Navy Plate", "Turf Comet", "Night Rally", "Rising Second", "Cream Headline", "Long Stretch", "Photo Finish", "Last Corner"];
const JOCKEYS: [string, string][] = [["A. Sample", "JP"], ["B. Example", "JP"], ["C. Rider", "FR"], ["D. Jockey", "JP"], ["E. Saddle", "IT"], ["F. Whip", "JP"], ["G. Stirrup", "GB"], ["H. Reins", "JP"], ["I. Crop", "JP"], ["J. Girth", "IE"], ["K. Bridle", "JP"], ["L. Bit", "JP"], ["M. Halter", "DE"], ["N. Tack", "JP"], ["O. Visor", "JP"], ["P. Blinker", "JP"], ["Q. Hood", "FR"], ["R. Shoe", "JP"]];
const FAVS = [9, 4, 12, 1, 15, 7, 11, 3, 14, 2, 16, 8, 13, 6, 18, 5, 17, 10];
const HC: Record<number, string> = { 2: "GB", 4: "US", 6: "FR", 9: "AU", 13: "IE", 16: "AR" };

export const sampleRunner = (i: number): Runner => ({
  number: i + 1, draw: null, name: NAMES[i % NAMES.length], jockey: JOCKEYS[i % 18][0],
  horseCountry: HC[i] ?? "JP", jockeyCountry: JOCKEYS[i % 18][1], fav: FAVS[i] ?? null, scratched: false,
  finish: null, outcome: null, time: "", margin: "",
});

/** A made-up finish for the 11R sample: [number, time, margin]. */
const RESULT_11: [number, string, string][] = [
  [9, "2:24.1", ""], [3, "2:24.3", "1¼"], [12, "2:24.3", "nk"], [1, "2:24.4", "½"], [7, "2:24.4", "hd"], [15, "2:24.6", "1½"],
  [4, "2:24.6", "nse"], [10, "2:24.9", "2"], [18, "2:25.0", "¾"], [2, "2:25.2", "1"], [11, "2:25.2", "hd"], [14, "2:25.4", "1¼"],
  [5, "2:25.9", "3"], [16, "2:25.9", "nk"], [8, "2:26.3", "2½"], [13, "2:26.5", "1"],
];

const race = (r: Omit<Race, "style" | "highlight" | "runners" | "result" | "card" | "photos"> & { n: number }): Race => {
  const { n, ...rest } = r;
  return { ...rest, highlight: null, style: newStyle(), result: newResult(), card: newCard(), photos: newPhotos(), runners: Array.from({ length: n }, (_, i) => sampleRunner(i)) };
};

export function sampleData(): AppData {
  const r10 = race({ id: "sample-10", date: "2026-11-29", course: "Tokyo", round: "10R", postTime: "15:01", jpName: "", name: "Shimotsuki Stakes", subtitle: "", grade: null, jump: false, class: null, surface: "Dirt", distanceM: 2100, n: 14 });
  const r11 = race({ id: "sample-11", date: "2026-11-29", course: "Tokyo", round: "11R", postTime: "15:40", jpName: "第1回 サンプルカップ", name: "Sample Cup", subtitle: "Example race for the broadcast overlay", grade: "G1", jump: false, class: null, surface: "Turf", distanceM: 2400, n: 18 });
  const r12 = race({ id: "sample-12", date: "2026-11-29", course: "Tokyo", round: "12R", postTime: "16:30", jpName: "", name: "Sample Juvenile", subtitle: "", grade: "G3", jump: false, class: "2YO", surface: "Turf", distanceM: 1600, n: 12 });
  r11.runners[5].scratched = true;
  r11.highlight = 9;
  RESULT_11.forEach(([no, time, margin], i) => Object.assign(r11.runners[no - 1], { finish: i + 1, time, margin }));
  r11.runners[16].outcome = "dnf"; // horse 17 pulled up; horse 6 is scratched and shows as SCR
  r10.style.drawScheme = "us";
  r10.style.numberScheme = "us";
  r10.style.show.draw = false;
  return { version: 1, races: [r10, r11, r12], active: r11.id, transition: "wipe", home: { title: "Tokyo Races", subtitle: "2026.11.29", highlight: null, page: 0 }, images: {} };
}

export { HOME };
