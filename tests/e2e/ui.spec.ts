import { test, expect, Page } from "@playwright/test";

// Loads the built UI (dist/ui.html) in an iframe; run `npm run build` first.
// UI -> harness messages arrive asynchronously, so outbound checks poll.
const HARNESS = "/tests/e2e/harness.html";

const outbound = (page: Page) => page.evaluate(() => (window as any).__harnessOutbound as { type: string }[]);
const sendToUi = (page: Page, msg: object) => page.evaluate((m) => (window as any).__harnessSend(m), msg);

test.describe("Jot UI e2e", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(HARNESS);
    await page.waitForFunction(() => (window as any).__harnessReady === true, { timeout: 5000 });
  });

  test("renders Figma-style tabs with Write open", async ({ page }) => {
    const frame = page.frameLocator("#plugin-frame");
    for (const tab of ["Write", "Entries", "Settings"]) await expect(frame.getByText(tab, { exact: true })).toBeVisible();
    await expect(frame.locator("#note")).toBeVisible();
  });

  test("save entry sends ADD_ENTRY", async ({ page }) => {
    const frame = page.frameLocator("#plugin-frame");
    await frame.locator("#note").fill("E2E test note");
    await frame.getByText("Save entry").click();

    await expect
      .poll(async () => (await outbound(page)).find((m) => m.type === "ADD_ENTRY"))
      .toMatchObject({ note: "E2E test note", entryType: "decision" });
  });

  test("Entries shows the journal and exports Markdown", async ({ page }) => {
    const frame = page.frameLocator("#plugin-frame");
    await frame.getByText("Entries", { exact: true }).click();
    await sendToUi(page, {
      type: "JOURNAL",
      entries: [{ id: "e1", createdAt: "2025-01-01T00:00:00Z", type: "decision", note: "E2E journal entry", pageName: "Page 1", nodeName: "Frame", nodeId: "1:2" }],
    });
    await expect(frame.locator(".entry")).toHaveCount(1);
    await expect(frame.locator(".entry")).toContainText("E2E journal entry");
    await expect(frame.locator(".pill")).toHaveText("Decision");

    await frame.getByText("Export Markdown").click();
    await expect.poll(async () => (await outbound(page)).some((m) => m.type === "EXPORT_MD")).toBe(true);
    await sendToUi(page, { type: "EXPORT_MD_RESULT", markdown: "# Jot\nTest export content" });
    await expect(frame.locator("#md")).toHaveValue("# Jot\nTest export content");
    await expect(frame.getByText("Copy to clipboard")).toBeVisible();
  });

  test("Settings saves the file key", async ({ page }) => {
    const frame = page.frameLocator("#plugin-frame");
    await frame.getByText("Settings", { exact: true }).click();
    await frame.locator("#fileUrlInput").fill("https://www.figma.com/design/ABC123/Project");
    await frame.getByText("Save", { exact: true }).click();

    await expect
      .poll(async () => (await outbound(page)).find((m) => m.type === "SET_FILE_KEY"))
      .toMatchObject({ fileKey: "ABC123" });
  });
});
