import { expect, test } from "@playwright/test";
import { completeVisualMission } from "./helpers";

test("parent insight reflects a completed child session and relocking denies access", async ({ page }, info) => {
  const insightURL = "/api/parent/insights?child_id=10000000-0000-0000-0000-000000000011";
  const unlock = async () => {
    await expect(page.getByText(/Connected demo · Shared sample explorer data/)).toBeVisible();
    await page.getByLabel("Parent PIN").fill("654321");
    await page.getByRole("button", { name: /Set PIN and enter|Enter mission control/ }).click();
    await expect(page.getByRole("heading", { name: "Mastery today" })).toBeVisible();
  };
  await page.goto("/parent");
  const denied = await page.request.get(insightURL);
  expect(denied.status()).toBe(403);
  await unlock();
  const before = await (await page.request.get(insightURL)).json();
  await page.getByRole("button", { name: "Lock parent space" }).click();
  await expect.poll(async () => (await page.request.get(insightURL)).status()).toBe(403);

  const { session, outcome } = await completeVisualMission(page);
  expect(outcome.sessionId).toBe(session.sessionId);
  // The completion screen keeps Parent navigation closed until the child leaves the mission.
  await expect(page.getByRole("button", { name: "Parent mission control", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Back to my universe" }).click();
  await page.getByRole("link", { name: "Parent mission control" }).click();
  expect((await page.request.get(insightURL)).status()).toBe(403);
  await unlock();
  await expect(page.getByRole("heading", { name: /\d+ completed missions?/ })).toBeVisible();
  const insight = await (await page.request.get(insightURL)).json();
  expect(insight.completedMissions).toBe(before.completedMissions + 1);
  expect(insight.masteryHistory).toHaveLength(before.masteryHistory.length + 1);
  expect(insight.masteryHistory.at(-1).value).toBeCloseTo(outcome.update.twin.mastery["identify-three-quarters"], 5);
  await expect(page.getByText(insight.insight.text, { exact: true })).toBeVisible();
  const foreign = await page.request.get("/api/parent/insights?child_id=20000000-0000-0000-0000-000000000022");
  expect(foreign.status()).toBe(404);
  await page.screenshot({ path: info.outputPath("connected-parent.png"), fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole("button", { name: "Lock parent space" }).click();
  await expect.poll(async () => (await page.request.get("/api/parent/settings")).status()).toBe(403);
  await expect(page.getByRole("heading", { name: "Mastery today" })).toHaveCount(0);
});
