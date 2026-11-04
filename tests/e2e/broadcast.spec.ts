import { expect, test, type BrowserContext, type Page } from "@playwright/test";

/** Dock and overlay open side by side in one browser profile, like OBS. */
async function open(context: BrowserContext): Promise<{ dock: Page; overlay: Page }> {
  const overlay = await context.newPage();
  await overlay.setViewportSize({ width: 1920, height: 1080 });
  await overlay.goto("#/overlay");
  const dock = await context.newPage();
  await dock.setViewportSize({ width: 420, height: 900 });
  await dock.goto("#/dock");
  return { dock, overlay };
}

test("first open seeds the sample and the overlay shows the Active race", async ({ context }) => {
  const { dock, overlay } = await open(context);
  await expect(dock.getByTestId("active-tag")).toHaveText("Active: 11R");
  await expect(overlay.locator("[data-layer][data-active] [data-testid=race-name]")).toHaveText("Sample Cup");
  await expect(overlay.locator("[data-layer][data-active] [data-no]")).toHaveCount(18);
  await expect(overlay.locator("[data-layer][data-active] [data-no][data-hl=on]")).toHaveAttribute("data-no", "9");
});

test("setting home or another race Active switches the overlay with a transition", async ({ context }) => {
  const { dock, overlay } = await open(context);
  await dock.getByRole("button", { name: "ตั้งหน้าแรกเป็น Active" }).click();
  await expect(overlay.locator("[data-layer][data-active] [data-testid=race-list]")).toBeVisible();
  await expect(overlay.locator("[data-layer][data-active] [data-testid=race-list-row]")).toHaveCount(3);
  await expect(overlay.locator("[data-layer]")).toHaveCount(1, { timeout: 3000 });
  await dock.getByLabel("ทรานซิชัน").selectOption("none");
  await dock.getByRole("button", { name: /ตั้ง 12R .* เป็น Active/ }).click();
  await expect(overlay.locator("[data-layer][data-active] [data-testid=race-name]")).toHaveText("Sample Juvenile");
  await expect(dock.getByTestId("active-tag")).toHaveText("Active: 12R");
});

test("edits in the dock reach the overlay: name, round, highlight, toggles, flags", async ({ context }) => {
  const { dock, overlay } = await open(context);
  await dock.getByRole("button", { name: "แก้ไข 11R Sample Cup" }).click();
  await dock.getByLabel("ชื่อรายการ").fill("Edited Cup");
  await dock.getByLabel("เลขรอบ").fill("Main");
  await expect(overlay.locator("[data-layer][data-active] [data-testid=race-name]")).toHaveText("Edited Cup");
  await expect(overlay.locator("[data-layer][data-active] [data-testid=race-facts]")).toContainText("Main Tokyo");
  await dock.locator("[data-h='3']").click();
  await expect(overlay.locator("[data-layer][data-active] [data-no][data-hl=on]")).toHaveAttribute("data-no", "3");
  await expect(overlay.locator("[data-layer][data-active] [data-no][data-hl=out]")).toHaveAttribute("data-no", "9");
  await dock.getByRole("button", { name: "ธงม้าเบอร์ 1: ญี่ปุ่น" }).click();
  await dock.getByLabel("ค้นหาประเทศ").fill("nzl");
  await dock.getByRole("option", { name: /นิวซีแลนด์/ }).click();
  await expect(overlay.locator("[data-layer][data-active] [data-no='1'] [data-testid=horse] img")).toHaveAttribute("alt", "NZ");
  await dock.getByRole("tab", { name: "สไตล์" }).click();
  await dock.getByTestId("show-draw").click();
  await expect(overlay.locator("[data-layer][data-active] [data-testid=table-head] span")).toHaveText(["NO.", "HORSE", "JOCKEY"]);
});

test("a moving highlight bar is never hidden behind the row backgrounds", async ({ context }) => {
  const { dock, overlay } = await open(context);
  await dock.getByRole("button", { name: "แก้ไข 11R Sample Cup" }).click();
  // Sample every frame while the bar grows on row 3 and shrinks on row 9: wherever a bar reaches, it must be the
  // topmost element at the left edge of the horse cell (a cell animating its opacity used to be painted over it).
  const result = overlay.evaluate(() => new Promise<{ samples: Record<string, number>; hidden: number }>((resolve) => {
    const samples: Record<string, number> = { "3": 0, "9": 0 };
    let hidden = 0, start = 0;
    const tick = (t: number) => {
      const live = document.querySelector("[data-layer][data-active]");
      if (live?.querySelector("[data-no='3'] [data-testid=highlight-bar]")) start ||= t;
      if (start) {
        for (const no of ["3", "9"]) {
          const row = live!.querySelector<HTMLElement>(`[data-no='${no}']`)!;
          const bar = row.querySelector<HTMLElement>("[data-testid=highlight-bar]");
          const cell = row.querySelector<HTMLElement>("[data-testid=horse]")!.getBoundingClientRect();
          const x = cell.left + 3, y = cell.top + cell.height / 2;
          if (bar && bar.getBoundingClientRect().right > x + 1) {
            samples[no]++;
            if (document.elementFromPoint(x, y) !== bar) hidden++;
          }
        }
        if (t - start > 600) return resolve({ samples, hidden });
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }));
  await dock.locator("[data-h='3']").click();
  const res = await result;
  expect(res.samples["3"]).toBeGreaterThan(5);
  expect(res.samples["9"]).toBeGreaterThan(5);
  expect(res.hidden).toBe(0);
});

test("home page settings and race highlight", async ({ context }) => {
  const { dock, overlay } = await open(context);
  await dock.getByRole("button", { name: "ตั้งหน้าแรกเป็น Active" }).click();
  await dock.getByLabel("Title", { exact: true }).fill("Kyoto Races");
  await dock.getByLabel("Sub title (วันที่)").fill("2026.12.06");
  await dock.locator("[data-lh='sample-12']").click();
  const live = overlay.locator("[data-layer][data-active]");
  await expect(live.locator("[data-testid=home-title]")).toHaveText("Kyoto Races");
  await expect(live.locator("[data-testid=home-subtitle]")).toHaveText("2026.12.06");
  await expect(live.locator("[data-testid=race-list-row][data-hl=on]")).toHaveAttribute("data-race", "sample-12");
});

test("import JSON (append / replace), reject a bad file, delete with confirm", async ({ context }) => {
  const { dock, overlay } = await open(context);
  const file = { name: "races.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify({ races: [{ date: "2026-12-06", course: "Kyoto", round: "11R", name: "Imported Stakes", runners: [{ number: 1, name: "A" }, { number: 2, name: "B" }] }] })) };
  await dock.getByTestId("import-file").setInputFiles(file);
  await dock.getByRole("button", { name: "เพิ่มต่อ" }).click();
  await expect(dock.getByRole("status")).toContainText("นำเข้า 1 รายการแล้ว");
  await expect(dock.getByTestId("race-row")).toHaveCount(4);

  await dock.getByTestId("import-file").setInputFiles({ name: "bad.json", mimeType: "application/json", buffer: Buffer.from("{ nope") });
  await expect(dock.getByRole("alert")).toContainText("นำเข้าไม่ได้");

  await dock.getByRole("button", { name: /ลบ 11R Sample Cup/ }).click();
  await dock.getByRole("button", { name: "ลบ", exact: true }).click();
  await expect(dock.getByTestId("race-row")).toHaveCount(3);
  // the deleted race was Active, so the overlay falls back to the home page
  await expect(overlay.locator("[data-layer][data-active] [data-testid=race-list]")).toBeVisible();

  await dock.getByTestId("import-file").setInputFiles(file);
  await dock.getByRole("button", { name: "แทนที่ทั้งหมด" }).click();
  await expect(dock.getByTestId("race-row")).toHaveCount(1);
});

test("export inside OBS: copy the JSON and paste it back in", async ({ context }) => {
  // OBS's browser sets window.obsstudio, and its docks ignore downloads
  await context.addInitScript(() => { (window as unknown as { obsstudio: object }).obsstudio = {}; });
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  const { dock } = await open(context);
  await dock.getByRole("button", { name: "ส่งออก", exact: true }).click();
  const panel = dock.getByTestId("export-panel");
  await expect(panel).toContainText("3 รายการ");
  await expect(panel).toContainText("dock ใน OBS บันทึกไฟล์ไม่ได้");
  // OBS's save dialog leaves an empty file, so saving is not offered there
  await expect(panel.getByRole("button", { name: "บันทึกไฟล์…" })).toHaveCount(0);
  expect(JSON.parse(await dock.getByTestId("export-text").inputValue()).races).toHaveLength(3);
  await panel.getByRole("button", { name: "คัดลอก JSON" }).click();
  await expect(panel.getByRole("status")).toContainText("คัดลอกแล้ว");
  const copied = await dock.evaluate(() => navigator.clipboard.readText());
  expect(JSON.parse(copied).races.map((r: { name: string }) => r.name)).toContain("Sample Cup");
  await panel.getByRole("button", { name: "ปิด" }).click();
  await expect(panel).toHaveCount(0);

  // the copied text goes back in through "วาง JSON"
  await dock.getByRole("button", { name: /ลบ 11R Sample Cup/ }).click();
  await dock.getByRole("button", { name: "ลบ", exact: true }).click();
  await expect(dock.getByTestId("race-row")).toHaveCount(2);
  await dock.getByRole("button", { name: "วาง JSON" }).click();
  await dock.getByTestId("paste-text").fill("{ nope");
  await dock.getByRole("button", { name: "นำเข้าข้อความนี้" }).click();
  await expect(dock.getByRole("alert")).toContainText("นำเข้าไม่ได้");
  await dock.getByTestId("paste-text").fill(copied);
  await dock.getByRole("button", { name: "นำเข้าข้อความนี้" }).click();
  await dock.getByRole("button", { name: "แทนที่ทั้งหมด" }).click();
  await expect(dock.getByTestId("race-row")).toHaveCount(3);

  // one race from the edit tab
  await dock.getByRole("button", { name: "แก้ไข 11R Sample Cup" }).click();
  await dock.getByRole("button", { name: "ส่งออกรายการนี้" }).click();
  expect(JSON.parse(await dock.getByTestId("export-text").inputValue()).races.map((r: { name: string }) => r.name)).toEqual(["Sample Cup"]);
});

test("export outside OBS downloads the file", async ({ context }) => {
  // no "Save as" dialog in this browser, so it falls back to a download
  await context.addInitScript(() => { delete (window as unknown as { showSaveFilePicker?: unknown }).showSaveFilePicker; });
  const { dock } = await open(context);
  await dock.getByRole("button", { name: "ส่งออก", exact: true }).click();
  const [download] = await Promise.all([dock.waitForEvent("download"), dock.getByRole("button", { name: "บันทึกไฟล์…" }).click()]);
  expect(download.suggestedFilename()).toMatch(/^otamasing-broadcast-compact-.*\.json$/);
  await expect(dock.getByTestId("export-panel").getByRole("status")).toContainText("ดาวน์โหลด");
});

test("a save that leaves an empty file is reported, and an empty file is named on import", async ({ context }) => {
  // a "Save as" dialog that makes the file but fails to write it, like OBS's browser
  await context.addInitScript(() => {
    (window as unknown as { showSaveFilePicker: unknown }).showSaveFilePicker = async () => ({
      createWritable: async () => ({ write: async () => {}, close: async () => { throw new DOMException("aborted", "AbortError"); } }),
      getFile: async () => new File([], "x.json"),
    });
  });
  const { dock } = await open(context);
  await dock.getByRole("button", { name: "ส่งออก", exact: true }).click();
  await dock.getByRole("button", { name: "บันทึกไฟล์…" }).click();
  await expect(dock.getByTestId("export-panel").getByRole("alert")).toContainText("บันทึกไฟล์ไม่สำเร็จ");
  await dock.getByTestId("import-file").setInputFiles({ name: "empty.json", mimeType: "application/json", buffer: Buffer.alloc(0) });
  await expect(dock.getByRole("alert").last()).toContainText("ไฟล์ว่างเปล่า");
});

test("a name too long for its box is squeezed sideways, not cut with an ellipsis", async ({ context }) => {
  const { dock, overlay } = await open(context);
  await dock.getByRole("button", { name: "แก้ไข 11R Sample Cup" }).click();
  await dock.getByLabel("ชื่อม้าเบอร์ 1", { exact: true }).fill("Onesmoothoperator Extraordinaire");
  const cell = overlay.locator("[data-layer][data-active] [data-no='1'] [data-testid=horse]");
  const text = cell.locator("[data-fit]");
  await expect(text).toHaveText("ONESMOOTHOPERATOR EXTRAORDINAIRE");
  const k = Number(await text.getAttribute("data-fit"));
  expect(k).toBeGreaterThan(0.3);
  expect(k).toBeLessThan(1);
  // the whole name is inside the cell
  const [c, t] = await Promise.all([cell.boundingBox(), text.boundingBox()]);
  expect(t!.x + t!.width).toBeLessThanOrEqual(c!.x + c!.width);
  // a short name is left as it is
  await dock.getByLabel("ชื่อม้าเบอร์ 1", { exact: true }).fill("Short");
  await expect(cell.locator("[data-fit]")).toHaveCount(0);
});

test("two-column card for more than 18 runners", async ({ context }) => {
  const { dock, overlay } = await open(context);
  await dock.getByRole("button", { name: "แก้ไข 11R Sample Cup" }).click();
  for (let i = 0; i < 4; i++) await dock.getByRole("button", { name: "+ เพิ่มม้า" }).click();
  await expect(overlay.locator("[data-layer][data-active] [data-testid=runner-column]")).toHaveCount(2);
  await expect(overlay.locator("[data-layer][data-active] [data-no]")).toHaveCount(22);
});

test("result page: 10 rows a page, locked horses stay on top with the yellow bar", async ({ context }) => {
  const { dock, overlay } = await open(context);
  await dock.getByLabel("ตั้งผล 11R Sample Cup เป็น Active").click();
  await expect(dock.getByTestId("active-tag")).toHaveText("Active: 11R ผล");
  const live = overlay.locator("[data-layer][data-active] [data-testid=result]");
  await dock.getByRole("button", { name: "แก้ไข 11R Sample Cup" }).click();
  await dock.getByRole("tab", { name: "ผล" }).click();
  // pages take turns by themselves by default; turn that off to step by hand
  await dock.getByTestId("result-auto").click();
  await dock.locator("[data-page='1']").click();
  const rows = live.locator("[data-no]");
  await expect(rows).toHaveCount(10);
  await expect(live.locator("[data-testid=pos]")).toHaveText(["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th", "10th"]);
  await expect(live.locator("[data-no='9'] [data-testid=time]")).toHaveText("2:24.1");
  await expect(live.locator("[data-no='3'] [data-testid=margin]")).toHaveText("1¼");

  for (const no of [9, 3, 12]) await dock.getByLabel(`ล็อคเบอร์ ${no}`).click();
  await expect(live.locator("[data-locked] [data-testid=highlight-bar]")).toHaveCount(6); // two bars per locked row
  await dock.locator("[data-page='2']").click();
  await expect(live.locator("[data-testid=pos]")).toHaveText(["1st", "2nd", "3rd", "11th", "12th", "13th", "14th", "15th", "16th", "DNF"]);
  await expect(live.locator("[data-locked]")).toHaveCount(3);
  await expect(live.locator("[data-no='17'] [data-testid=time]")).toHaveText("");

  // a new position from the dock reaches the screen; unlocking puts the horse back in the paged rows
  await dock.getByLabel("ล็อคเบอร์ 12").click();
  await expect(live.locator("[data-testid=pos]")).toHaveText(["1st", "2nd", "11th", "12th", "13th", "14th", "15th", "16th", "DNF", "SCR"]);
  // a disqualified horse leaves the finishers and goes after DNF
  await dock.getByLabel("สถานะเบอร์ 11").selectOption("dq");
  await expect(live.locator("[data-testid=pos]")).toHaveText(["1st", "2nd", "12th", "13th", "14th", "15th", "16th", "DNF", "DQ", "SCR"]);
  await dock.getByLabel("เวลาเบอร์ 9").fill("2:23.9");
  await expect(live.locator("[data-no='9'] [data-testid=time]")).toHaveText("2:23.9");
  // fraction buttons type into the margin field in use, at the caret
  await expect(dock.getByRole("button", { name: "ใส่ ½" })).toBeDisabled();
  const margin = dock.getByLabel("ระยะห่างเบอร์ 9", { exact: true });
  await margin.fill("2");
  await dock.getByRole("button", { name: "ใส่ ½" }).click();
  await expect(margin).toHaveValue("2½");
  await expect(margin).toBeFocused();
  await margin.press("Home");
  await dock.getByRole("button", { name: "ใส่ ¾" }).click();
  await expect(margin).toHaveValue("¾2½");
  await expect(live.locator("[data-no='9'] [data-testid=margin]")).toHaveText("¾2½");
});

test("result pages take turns by themselves every x seconds", async ({ context }) => {
  const { dock, overlay } = await open(context);
  await dock.getByLabel("ตั้งผล 11R Sample Cup เป็น Active").click();
  const first = overlay.locator("[data-layer][data-active] [data-testid=result] [data-testid=pos]").first();
  await dock.getByRole("button", { name: "แก้ไข 11R Sample Cup" }).click();
  await dock.getByRole("tab", { name: "ผล" }).click();
  await expect(dock.getByTestId("result-auto")).toHaveAttribute("aria-checked", "true");
  await dock.getByLabel("เปลี่ยนหน้าทุกกี่วินาที").fill("1");
  await expect(first).toHaveText("11th", { timeout: 4000 });
  await expect(dock.locator("[data-page='2']")).toHaveAttribute("aria-pressed", "true");
  await expect(first).toHaveText("1st", { timeout: 4000 });
  await expect(first).toHaveText("11th", { timeout: 4000 });
  // off: stays on the page on screen
  await dock.getByTestId("result-auto").click();
  const now = await first.textContent();
  await overlay.waitForTimeout(2500);
  await expect(first).toHaveText(now!);
});

test("the blank page takes everything off the screen, with or without a transition", async ({ context }) => {
  const { dock, overlay } = await open(context);
  for (const t of ["wipe", "slide", "fade", "none"]) {
    await dock.getByLabel("ทรานซิชัน").selectOption(t);
    await dock.getByRole("button", { name: "ตั้งหน้าเปล่าเป็น Active" }).click();
    await expect(dock.getByTestId("active-tag")).toHaveText("Active: หน้าเปล่า");
    await expect(overlay.locator("[data-layer]")).toHaveCount(1, { timeout: 3000 });
    await expect(overlay.locator("[data-layer][data-active=blank] [data-testid=blank]")).toHaveCount(1);
    await dock.getByRole("button", { name: "ตั้งหน้าแรกเป็น Active" }).click();
    await expect(overlay.locator("[data-layer]")).toHaveCount(1, { timeout: 3000 });
    await expect(overlay.locator("[data-layer][data-active] [data-testid=race-list]")).toBeVisible();
  }
});

const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==", "base64");
const png = (name: string) => ({ name, mimeType: "image/png", buffer: PNG });

test("pictures: separate sets for the racecard and the result page, step by hand or change automatically", async ({ context }) => {
  const { dock, overlay } = await open(context);
  const shownKey = () => overlay.locator("[data-layer][data-active] [data-testid=photo]").last().getAttribute("data-key");
  await dock.getByRole("button", { name: "แก้ไข 11R Sample Cup" }).click();
  await dock.getByTestId("add-photos-card").setInputFiles([png("a.png"), png("b.png")]);
  await expect(dock.getByTestId("thumbs-card").locator("[data-thumb]")).toHaveCount(2);
  await dock.getByTestId("auto-card").click(); // manual
  await dock.getByRole("button", { name: "แสดงรูปที่ 1" }).click();
  await expect(dock.getByTestId("photo-pos-card")).toHaveText("1 / 2");
  await expect.poll(shownKey).toBeTruthy();
  const first = await shownKey();
  await dock.getByRole("button", { name: "รูปถัดไป" }).click();
  await expect(dock.getByTestId("photo-pos-card")).toHaveText("2 / 2");
  await expect.poll(shownKey).not.toBe(first);
  const second = await shownKey();
  // automatic every 1 second
  await dock.getByLabel("ทุกกี่วินาที").fill("1");
  await dock.getByTestId("auto-card").click();
  await expect.poll(shownKey, { timeout: 4000 }).toBe(first);
  await expect.poll(shownKey, { timeout: 4000 }).toBe(second);

  // the result page has its own pictures
  await dock.getByRole("tab", { name: "ผล" }).click();
  await dock.getByTestId("add-photos-result").setInputFiles([png("c.png")]);
  await dock.getByRole("button", { name: "ตั้งหน้าผลเป็น Active" }).click();
  await expect(overlay.locator("[data-layer][data-active] [data-testid=result]")).toBeVisible();
  await expect.poll(shownKey).not.toBe(first);
  expect([first, second]).not.toContain(await shownKey());
  // removing it leaves the result page without a picture
  await dock.getByRole("button", { name: "ลบรูปที่ 1" }).click();
  await expect(overlay.locator("[data-layer][data-active] [data-testid=photo]")).toHaveCount(0);
});

test("the home page shows 8 races a page; the dock turns the page", async ({ context }) => {
  const { dock, overlay } = await open(context);
  const races = Array.from({ length: 10 }, (_, i) => ({ date: "2026-12-06", course: "Kyoto", round: `${i + 1}R`, name: `Race ${i + 1}`, runners: [{ number: 1 }, { number: 2 }] }));
  await dock.getByTestId("import-file").setInputFiles({ name: "day.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify({ races })) });
  await dock.getByRole("button", { name: "เพิ่มต่อ" }).click();
  await dock.getByRole("button", { name: "ตั้งหน้าแรกเป็น Active" }).click();
  const rows = overlay.locator("[data-layer][data-active] [data-testid=race-list-row]");
  await expect(rows).toHaveCount(8);
  await dock.getByTestId("quick-home-pages").getByRole("button", { name: /2$/ }).click();
  await expect(rows).toHaveCount(5); // 13 races: 8 + 5
  await expect(rows.first()).toHaveAttribute("data-race", /.+/);
  // highlighting a race on page 1 turns back to page 1
  await dock.locator("[data-lh='sample-11']").click();
  await expect(rows).toHaveCount(8);
  await expect(overlay.locator("[data-layer][data-active] [data-testid=race-list-row][data-hl=on]")).toHaveAttribute("data-race", "sample-11");
});
