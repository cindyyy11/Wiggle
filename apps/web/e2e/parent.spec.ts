import { expect, test } from "@playwright/test";
import { completeVisualMission } from "./helpers";

test("parent insight reflects a completed child session and relocking denies access", async ({ page }, info) => {
  await completeVisualMission(page);
  await page.getByRole("link", { name: "Parent mission control" }).click();
  const denied = await page.request.get("/api/parent/insights?child_id=10000000-0000-0000-0000-000000000011");
  expect(denied.status()).toBe(403);
  await expect(page.getByText(/Connected demo · Shared sample explorer data/)).toBeVisible();
  await page.getByLabel("Parent PIN").fill("654321");
  await page.getByRole("button", { name: /Set PIN and enter|Enter mission control/ }).click();
  await expect(page.getByRole("heading", { name: "Mastery today" })).toBeVisible();
  await expect(page.getByRole("heading", { name: /\d+ completed missions?/ })).toBeVisible();
  const insight = await (await page.request.get("/api/parent/insights?child_id=10000000-0000-0000-0000-000000000011")).json();
  expect(insight.completedMissions).toBeGreaterThan(0);
  expect(insight.masteryHistory.length).toBeGreaterThan(0);
  await expect(page.getByText(insight.insight.text, { exact: true })).toBeVisible();
  const foreign = await page.request.get("/api/parent/insights?child_id=20000000-0000-0000-0000-000000000022");
  expect(foreign.status()).toBe(404);
  await page.screenshot({ path: info.outputPath("connected-parent.png"), fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole("button", { name: "Lock parent space" }).click();
  await expect.poll(async () => (await page.request.get("/api/parent/settings")).status()).toBe(403);
  await expect(page.getByRole("heading", { name: "Mastery today" })).toHaveCount(0);
});
