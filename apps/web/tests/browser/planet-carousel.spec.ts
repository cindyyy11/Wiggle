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
  await page.getByRole("button", { name: "Bahasa Melayu (coming soon)", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Bahasa Melayu is coming soon");
  await expect(page).toHaveURL(/\/$/);
  await page.getByRole("button", { name: "Show Numeria", exact: true }).click();
  await page.getByRole("button", { name: "Explore Numeria", exact: true }).click();
  await expect(page.getByRole("button", { name: "Start fractions mission", exact: true })).toBeVisible();
});
