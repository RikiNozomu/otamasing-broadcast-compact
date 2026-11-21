import { describe, expect, it } from "vitest";
import { exportFile, mergeImport, parseFile, raceNowAfter } from "../../src/lib/model";
import { sampleData } from "../../src/lib/sample";
import { clockText, raceNowBox, raceNowColumns, raceNowRace } from "../../src/overlay/RaceNow";

describe("race now", () => {
  it("centres the box by default and keeps it on screen at any size", () => {
    expect(raceNowBox({ x: 50, y: 50, scale: 1 })).toMatchObject({ left: 80, top: 290, w: 1760, h: 500 });
    expect(raceNowBox({ x: 100, y: 100, scale: 1.5 }).left).toBeLessThan(0 + 1); // wider than the screen: pinned left
  });
  it("puts up to 6 names in a column, then 2, then 3 columns", () => {
    expect([2, 6, 7, 12, 13, 18].map(raceNowColumns)).toEqual([1, 1, 2, 2, 3, 3]);
  });
  it("shows the picked race, or nothing when none is picked or it is gone", () => {
    const d = sampleData();
    expect(raceNowRace(d.races, { raceId: null })).toBeNull();
    expect(raceNowRace(d.races, { raceId: "sample-11" })?.name).toBe("Sample Cup");
    expect(raceNowRace(d.races, { raceId: "gone" })).toBeNull();
  });
  it("writes the clock in Thai or Japan time", () => {
    const at = new Date("2026-11-22T06:05:09Z");
    expect(clockText(at, "th")).toEqual({ time: "13:05:09", date: "SUN 22 NOV" });
    expect(clockText(at, "jp").time).toBe("15:05:09");
  });
  it("exports place, size and clock but not the race; import keeps the race if it stays", () => {
    const d = { ...sampleData(), raceNow: { ...sampleData().raceNow, raceId: "sample-11", tz: "jp" as const, y: 40 } };
    const file = exportFile(d);
    expect(file.raceNow).toEqual({ raceId: null, tz: "jp", x: 50, y: 40, scale: 1 });
    const parsed = parseFile(JSON.stringify(file));
    if (!parsed.ok) throw new Error(parsed.error);
    expect(mergeImport({ ...d, raceNow: { ...d.raceNow, tz: "th", y: 50 } }, parsed.data, "replace").raceNow).toMatchObject({ raceId: "sample-11", tz: "jp", y: 40 });
    expect(mergeImport(d, { ...parsed.data, races: [] , horses: d.horses }, "append").raceNow.raceId).toBe("sample-11");
    expect(raceNowAfter(d.raceNow, []).raceId).toBeNull();
  });
});
