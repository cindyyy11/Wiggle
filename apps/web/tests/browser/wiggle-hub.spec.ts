import { expect, test } from "@playwright/test";

test("the solar hub keeps its controls and preview inside an 880px viewport", async ({ page }) => {
  await page.setViewportSize({ width: 880, height: 900 });
  await page.goto("/");
  await page.getByRole("button", { name: "Let’s Wiggle" }).click();

  await expect(page.getByRole("heading", { name: "Pick a bright place to wonder." })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Choose a learning world" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Numeria" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
