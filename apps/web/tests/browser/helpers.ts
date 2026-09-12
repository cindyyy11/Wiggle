import { expect, type Page } from "@playwright/test";

export async function launchWiggle(page: Page) {
  await page.getByRole("button", { name: "Let's Wiggle", exact: true }).click();
  await expect(page.getByRole("region", { name: "Explore Numeria" })).toBeVisible();
}
