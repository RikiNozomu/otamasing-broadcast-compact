import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { exportFile, mergeImport, mergeRaceData, parseFile, type AppData } from "../../src/lib/model";
import { sampleData } from "../../src/lib/sample";
import { buildSchema } from "../../scripts/build-schema";

const read = (p: string) => readFileSync(new URL(`../../${p}`, import.meta.url), "utf8");

describe("parseFile", () => {
  it("accepts the documented example and fills defaults", () => {
    const res = parseFile(read("docs/example-race.json"));
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const [a, b] = res.data.races;
    expect(a.style.drawScheme).toBe("jra");
    expect(a.runners[0]).toMatchObject({ draw: null, scratched: false });
    expect(a.runners[3].scratched).toBe(true);
    expect(b.style.show.draw).toBe(false);
    expect(b.style.show.fav).toBe(true);
  });
  it("accepts a bare array of races", () => {
    const res = parseFile(JSON.stringify([{ date: "2026-01-01", name: "X", runners: [{ number: 1 }, { number: 2 }] }]));
    expect(res.ok).toBe(true);
  });
  it("rejects broken files with a readable message", () => {
    expect(parseFile("{")).toEqual({ ok: false, error: "ไฟล์ไม่ใช่ JSON ที่ถูกต้อง" });
    const noName = parseFile(JSON.stringify({ races: [{ date: "2026-01-01", runners: [{ number: 1 }, { number: 2 }] }] }));
    expect(noName.ok).toBe(false);
    const dup = parseFile(JSON.stringify({ races: [{ date: "2026-01-01", name: "X", runners: [{ number: 1 }, { number: 1 }] }] }));
    expect(dup).toMatchObject({ ok: false });
    if (!dup.ok) expect(dup.error).toContain("ซ้ำ");
    const one = parseFile(JSON.stringify({ races: [{ date: "2026-01-01", name: "X", runners: [{ number: 1 }] }] }));
    expect(one.ok).toBe(false);
    const flag = parseFile(JSON.stringify({ races: [{ date: "2026-01-01", name: "X", runners: [{ number: 1, horseCountry: "jpn" }, { number: 2 }] }] }));
    expect(flag.ok).toBe(false);
  });
});

describe("mergeImport", () => {
  const cur: AppData = sampleData();
  const file = (round: string, name: string) => {
    const r = parseFile(JSON.stringify({ races: [{ date: "2026-11-29", course: "tokyo", round, name, runners: [{ number: 1 }, { number: 2 }] }] }));
    if (!r.ok) throw new Error(r.error);
    return r.data;
  };
  it("append replaces a race with the same date + course + round and keeps its id", () => {
    const next = mergeImport(cur, file("11R", "Renamed"), "append");
    expect(next.races).toHaveLength(3);
    const r = next.races.find((x) => x.round === "11R")!;
    expect(r.name).toBe("Renamed");
    expect(r.id).toBe("sample-11");
  });
  it("after an import the screen goes to the home page, or stays blank if the blank page was on", () => {
    expect(mergeImport(cur, file("11R", "Renamed"), "append").active).toBe("home");
    expect(mergeImport({ ...cur, active: "home" }, file("9R", "New"), "append").active).toBe("home");
    expect(mergeImport({ ...cur, active: "blank" }, file("9R", "New"), "append").active).toBe("blank");
    expect(mergeImport({ ...cur, active: "sample-11:result" }, file("1R", "Only"), "replace").active).toBe("home");
    expect(mergeImport({ ...cur, active: "blank" }, file("1R", "Only"), "replace").active).toBe("blank");
  });
  it("append adds new races at the end", () => {
    const next = mergeImport(cur, file("9R", "New"), "append");
    expect(next.races.map((x) => x.round)).toEqual(["10R", "11R", "12R", "9R"]);
  });
  it("replace swaps the whole list", () => {
    const next = mergeImport(cur, file("1R", "Only"), "replace");
    expect(next.races).toHaveLength(1);
    expect(next.active).toBe("home");
  });
  it("an export imports back to the same races", () => {
    const res = parseFile(JSON.stringify(exportFile(cur)));
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const next = mergeImport({ ...cur, races: [] }, res.data, "replace");
    expect(next.races).toEqual(cur.races);
    expect(next.home).toEqual(cur.home);
  });
});

describe("mergeRaceData", () => {
  const base = sampleData();
  const r11 = base.races.find((r) => r.round === "11R")!;
  const cur: AppData = {
    ...base, active: "sample-11:result",
    races: base.races.map((r) => (r.id === r11.id ? { ...r, highlight: 2, style: { ...r.style, numberScheme: "jra" as const } } : r)),
  };
  const fileOf = (races: unknown[], extra: object = {}) => {
    const r = parseFile(JSON.stringify({ races, ...extra }));
    if (!r.ok) throw new Error(r.error);
    return r.data;
  };
  const runners = r11.runners.map((x, i) => ({ ...x, fav: i + 1, finish: i + 1, horseWeight: 480, horseWeightChange: 2, scratched: x.number === 3 }));
  it("updates only race data of matching races; horses, photos, style, screen stay", () => {
    const file = fileOf([{ date: r11.date, course: r11.course.toUpperCase(), round: r11.round, name: "Updated", postTime: "15:40", runners },
      { date: "2030-01-01", name: "Not here", runners: [{ number: 1 }, { number: 2 }] }],
      { horses: [{ name: "Some Horse" }], home: { title: "Changed" } });
    const { data, updated, skipped } = mergeRaceData(cur, file);
    expect([updated, skipped]).toEqual([1, 1]);
    const r = data.races.find((x) => x.id === r11.id)!;
    const was = cur.races.find((x) => x.id === r11.id)!;
    expect(r.name).toBe("Updated");
    expect(r.postTime).toBe("15:40");
    expect(r.runners[0]).toMatchObject({ fav: 1, finish: 1, horseWeight: 480, horseWeightChange: 2 });
    expect(r.runners.find((x) => x.number === 3)!.scratched).toBe(true);
    expect(r.style).toEqual(was.style);
    expect(r.photos).toEqual(was.photos);
    expect(r.card).toEqual(was.card);
    expect(r.result).toEqual(was.result);
    expect(r.highlight).toBe(2);
    expect(data.races).toHaveLength(cur.races.length);
    expect(data.horses).toBe(cur.horses);
    expect(data.horseSettings).toBe(cur.horseSettings);
    expect(data.home).toBe(cur.home);
    expect(data.active).toBe("sample-11:result");
  });
  it("drops the highlight when that horse is scratched or gone", () => {
    const file = fileOf([{ date: r11.date, course: r11.course, round: r11.round, name: r11.name, runners: runners.map((x) => ({ ...x, scratched: x.number === 2 })) }]);
    expect(mergeRaceData(cur, file).data.races.find((x) => x.id === r11.id)!.highlight).toBeNull();
  });
});

describe("JSON schema", () => {
  it("schema/race.schema.json is up to date (run npm run schema)", () => {
    expect(read("schema/race.schema.json")).toBe(buildSchema());
  });
});
