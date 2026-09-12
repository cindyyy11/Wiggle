import { expect, test, type Page } from "@playwright/test";
import { denyCamera, enterScience, launchWiggle } from "./helpers";

const calls = (page: Page) => page.evaluate(() => (window as typeof window & { __magnetCameraCalls: () => number }).__magnetCameraCalls());
const help = (page: Page) => page.getByRole("heading", { name: "Ask an adult to turn on the camera" });
test.beforeEach(async ({ page }) => { await denyCamera(page); await page.goto("/"); await launchWiggle(page); await enterScience(page); });

test("requests the camera automatically only after entry", async ({ page }, info) => {
  expect(await calls(page)).toBe(0);
  await page.getByRole("button", { name: "Start Magnet Lab", exact: true }).click();
  await expect(help(page)).toBeVisible();
  expect(await calls(page)).toBe(1);
  await expect(page.getByRole("button", { name: /Use hand gestures|Try the magnet|Test paper clip/ })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: info.outputPath(`camera-help-${info.project.name}.png`), fullPage: true });
});
test("retry requests the camera again and keeps safe adult help", async ({ page }) => {
  await page.getByRole("button", { name: "Start Magnet Lab", exact: true }).click();
  await expect(help(page)).toBeVisible();
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(help(page)).toBeVisible();
  expect(await calls(page)).toBe(2);
});
test("Escape returns focus to the lab entry", async ({ page }) => {
  await page.getByRole("button", { name: "Start Magnet Lab", exact: true }).click();
  await expect(help(page)).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Start Magnet Lab", exact: true })).toBeFocused();
});
