import { expect, test } from "@playwright/test";

test("the solar hub keeps its controls and preview inside an 880px viewport", async ({ page }) => {
  await page.setViewportSize({ width: 880, height: 900 });
  await page.goto("/");
  await page.getByRole("button", { name: "Let’s Wiggle" }).click();

  await expect(page.getByRole("heading", { name: "Orbit a little world, then land where curiosity leads." })).toBeVisible();
  await expect(page.getByText("Drag to orbit · scroll to zoom · choose a nearby world")).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Choose a learning world" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Numeria" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
