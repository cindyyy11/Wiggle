import { expect, test } from "@playwright/test";

test("connected memory demo stays labelled through setup, automatic lock and PIN re-entry", async ({ page }) => {
  test.skip(!process.env.WIGGLE_TEST_CONNECTED_PARENT, "Run against a fresh memory API and its connected Next proxy.");
  const pinRequests: string[] = [];
  page.on("request", request => { if (request.method() === "POST" && /\/pin\/(setup|verify)$/.test(request.url())) pinRequests.push(new URL(request.url()).pathname); });
  await page.clock.install();
  await page.goto("/parent");
  await expect(page.getByText(/Connected demo · Shared sample explorer data/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Set PIN and enter" })).toBeVisible();
  await page.getByLabel("Parent PIN").fill("654321");
  await page.getByRole("button", { name: "Set PIN and enter" }).click();
  await expect(page.getByRole("heading", { name: "Mastery today" })).toBeVisible();
  await expect(page.getByText(/Connected demo · Shared sample explorer data/)).toBeVisible();
  await expect(page.getByText(/This demo preference lasts only for this server session/)).toBeVisible();
  await expect(page.getByText(/This preference is saved for your household/)).toHaveCount(0);
  await page.clock.fastForward("15:00");
  await expect(page.getByRole("heading", { name: "Mastery today" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Enter mission control" })).toBeVisible();
  await page.getByLabel("Parent PIN").fill("654321");
  await page.getByRole("button", { name: "Enter mission control" }).click();
  await expect(page.getByRole("heading", { name: "Mastery today" })).toBeVisible();
  expect(pinRequests).toEqual(["/api/parent/pin/setup", "/api/parent/pin/verify"]);
  await expect(page.getByText(/Connected demo · Shared sample explorer data/)).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
