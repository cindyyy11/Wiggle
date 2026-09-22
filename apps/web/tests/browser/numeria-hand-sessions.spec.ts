import { expect, test } from "@playwright/test";
import { denyCamera, launchNumeria } from "./helpers";

const REGIONS = ["Number Valley", "Geometry Ridge", "Crystal Crater"] as const;

test("the Numeria field regions ask for the camera on entry and show adult help when it is blocked", async ({ page }, info) => {
  test.setTimeout(120000);
  await denyCamera(page);
  await page.goto("/");
  await launchNumeria(page);
  const calls = () => page.evaluate(() => (window as unknown as { __magnetCameraCalls(): number }).__magnetCameraCalls());
  for (const region of REGIONS) {
    await page.getByRole("button", { name: `Visit ${region}`, exact: true }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    const before = await calls();
    await page.getByRole("button", { name: `Explore ${region}`, exact: true }).click();
    const dialog = page.getByRole("dialog", { name: `${region} activity session` });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("heading", { name: "Ask an adult to turn on the camera" })).toBeVisible();
    expect(await calls()).toBeGreaterThan(before);
    await expect(dialog.getByRole("radio")).toHaveCount(0);
    await expect(dialog.getByRole("button", { name: "Check answer" })).toHaveCount(0);
    await dialog.getByRole("button", { name: "Try again", exact: true }).click();
    await expect.poll(calls).toBeGreaterThan(before + 1);
    await page.screenshot({ path: info.outputPath(`${region.toLowerCase().replace(/ /g, "-")}-adult-help-${info.project.name}.png`) });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.getByRole("region", { name: "Explore Numeria" })).toBeVisible();
  }
});

test("Fraction Forest still opens the real mission, unaffected by the camera", async ({ page }) => {
  await denyCamera(page);
  await page.goto("/");
  await launchNumeria(page);
  await page.getByRole("button", { name: "Explore Fraction Forest", exact: true }).click();
  await expect(page.getByRole("region", { name: "Fraction mission" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Ask an adult to turn on the camera" })).toHaveCount(0);
});
