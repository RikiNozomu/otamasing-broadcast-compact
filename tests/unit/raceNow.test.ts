import { describe, expect, it } from "vitest";
import { exportFile, mergeImport, parseFile, raceNowAfter } from "../../src/lib/model";
import { sampleData } from "../../src/lib/sample";
import { clockText, countdownText, postAt, raceNowBox, raceNowColumns, raceNowRace } from "../../src/overlay/RaceNow";

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
  it("writes the clock in Thai time", () => {
    expect(clockText(new Date("2026-11-22T06:05:09Z"))).toEqual({ time: "13:05:09", date: "SUN 22 NOV" });
  });
  it("reads the post time in Japan or Thai time", () => {
    const r = { date: "2026-11-22", postTime: "15:40" };
    expect(postAt(r, "jp")?.toISOString()).toBe("2026-11-22T06:40:00.000Z");
    expect(postAt(r, "th")?.toISOString()).toBe("2026-11-22T08:40:00.000Z");
    expect(postAt({ date: "2026-11-22", postTime: "" }, "jp")).toBeNull();
    expect(postAt({ date: "2026-11-22", postTime: "25:00" }, "jp")).toBeNull();
  });
  it("counts down to the post time, then says SOON", () => {
    const post = new Date("2026-11-22T06:40:00Z");
    expect(countdownText(post, new Date("2026-11-22T06:27:55Z"))).toBe("12:05");
    expect(countdownText(post, new Date("2026-11-22T05:37:57Z"))).toBe("1:02:03");
    expect(countdownText(post, new Date("2026-11-22T06:39:59.500Z"))).toBe("00:01");
    expect(countdownText(post, new Date("2026-11-22T06:40:00Z"))).toBe("SOON");
    expect(countdownText(null, new Date())).toBe("SOON");
  });
  it("exports place, size and clock but not the race; import keeps the race if it stays", () => {
    const d = { ...sampleData(), raceNow: { ...sampleData().raceNow, raceId: "sample-11", status: "live" as const, tz: "th" as const, y: 40 } };
    const file = exportFile(d);
    expect(file.raceNow).toEqual({ raceId: null, status: "waiting", tz: "th", x: 50, y: 40, scale: 1 });
    const parsed = parseFile(JSON.stringify(file));
    if (!parsed.ok) throw new Error(parsed.error);
    expect(mergeImport({ ...d, raceNow: { ...d.raceNow, tz: "jp", y: 50 } }, parsed.data, "replace").raceNow).toMatchObject({ raceId: "sample-11", status: "live", tz: "th", y: 40 });
    expect(mergeImport(d, { ...parsed.data, races: [] , horses: d.horses }, "append").raceNow.raceId).toBe("sample-11");
    expect(raceNowAfter(d.raceNow, []).raceId).toBeNull();
  });
});
