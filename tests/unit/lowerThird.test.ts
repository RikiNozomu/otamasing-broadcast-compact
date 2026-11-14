import { describe, expect, it } from "vitest";
import { exportFile, mergeImport, parseFile, type AppData } from "../../src/lib/model";
import { sampleData } from "../../src/lib/sample";
import { lowerThirdBox, lowerThirdRunner, signedChange } from "../../src/overlay/LowerThird";

const withLt = (patch: Partial<AppData["lowerThird"]>): AppData => {
  const d = sampleData();
  return { ...d, lowerThird: { ...d.lowerThird, ...patch } };
};

describe("lower third", () => {
  it("places the plate inside the screen at any size", () => {
    expect(lowerThirdBox({ x: 0, y: 0, scale: 1 })).toMatchObject({ left: 0, top: 0, w: 1200, h: 150 });
    expect(lowerThirdBox({ x: 100, y: 100, scale: 1 })).toMatchObject({ left: 720, top: 930 });
    expect(lowerThirdBox({ x: 100, y: 100, scale: 1.5 })).toMatchObject({ left: 120, top: 855 });
  });
  it("shows a runner only when it is picked, in a race that exists, and not scratched", () => {
    const d = sampleData();
    expect(lowerThirdRunner(d.races, { ...d.lowerThird, raceId: "sample-11", number: null })).toBeNull();
    expect(lowerThirdRunner(d.races, { ...d.lowerThird, raceId: "sample-11", number: 9 })?.runner.number).toBe(9);
    expect(lowerThirdRunner(d.races, { ...d.lowerThird, raceId: "sample-11", number: 6 })).toBeNull(); // scratched
    expect(lowerThirdRunner(d.races, { ...d.lowerThird, raceId: "gone", number: 1 })).toBeNull();
  });
  it("writes the weight change with a sign", () => {
    expect([signedChange(4), signedChange(0), signedChange(-4)]).toEqual(["+4", "±0", "−4"]);
  });
  it("exports position and size but not the runner on screen; import keeps the runner if its race stays", () => {
    const d = withLt({ raceId: "sample-11", number: 3, x: 50, scale: 1.2 });
    const file = exportFile(d);
    expect(file.lowerThird).toEqual({ raceId: null, number: null, x: 50, y: 90, scale: 1.2 });
    const res = parseFile(JSON.stringify({ ...file, lowerThird: { x: 10, y: 20, scale: 0.8 } }));
    if (!res.ok) throw new Error(res.error);
    const replaced = mergeImport(d, res.data, "replace");
    expect(replaced.lowerThird).toEqual({ raceId: "sample-11", number: 3, x: 10, y: 20, scale: 0.8 });
    // the race went away: the plate is hidden
    const other = parseFile(JSON.stringify({ races: [{ date: "2026-01-01", name: "X", runners: [{ number: 1 }, { number: 2 }] }] }));
    if (!other.ok) throw new Error(other.error);
    expect(mergeImport(d, other.data, "replace").lowerThird).toMatchObject({ raceId: null, number: null, x: 50 });
    expect(mergeImport(d, other.data, "append").lowerThird).toMatchObject({ raceId: "sample-11", number: 3 });
  });
});
