import { expect, test } from "@playwright/test";
import { launchWiggle } from "./helpers";

test("swiping changes the planet without entering it; locked worlds stay locked", async ({ page }) => {
  await page.goto("/");
  await launchWiggle(page);
  await expect(page.getByRole("heading", { name: "Numeria", exact: true })).toBeVisible();
  const orbit = page.getByTestId("subject-orbit");
  await expect(orbit.locator("canvas")).toBeVisible();
  const box = await orbit.boundingBox();
  expect(box).not.toBeNull();
  await page.mouse.move(box!.x + box!.width * .65, box!.y + box!.height * .55);
  await page.mouse.down();
  await page.mouse.move(box!.x + box!.width * .3, box!.y + box!.height * .55, { steps: 12 });
  await page.mouse.up();
  await expect(page.getByRole("heading", { name: "Science Planet", exact: true })).toBeVisible();
  await expect(page).toHaveURL(/\/$/);
  await page.getByRole("button", { name: "Next planet", exact: true }).click();
  // Locked worlds are a grey mystery: named "???", shown but disabled, and they never navigate.
  await expect(page.getByRole("heading", { name: "???", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "??? (coming soon)", exact: true })).toBeDisabled();
  await expect(page.getByText("More adventures are on their way.")).toBeVisible();
  await expect(page).toHaveURL(/\/$/);
  await page.getByRole("button", { name: "Previous planet", exact: true }).click();
  await page.getByRole("button", { name: "Previous planet", exact: true }).click();
  await page.getByRole("button", { name: "Explore Numeria", exact: true }).click();
  await expect(page.getByRole("button", { name: "Explore Fraction Forest", exact: true })).toBeVisible();
});
