import { expect, test } from "@playwright/test";
import { denyCamera, enterScience, enterMagnetLab, launchWiggle } from "./helpers";

test("saved Science globe walks, switches camera, and resumes after camera-first lab", async ({ page }, info) => {
  await denyCamera(page);
  await page.goto("/");
  await launchWiggle(page);
  await enterScience(page);
  const world = page.getByRole("region", { name: "Science Planet", exact: true });
  await expect(world.locator("canvas")).toBeVisible();
  await expect(world).toHaveAttribute("data-camera-mode", "globe");
  await expect(world).not.toHaveAttribute("data-quality", "fallback");
  await page.screenshot({ path: info.outputPath("science-globe-" + info.project.name + ".png"), fullPage: true });
  for (const land of ["Magnet Lands", "Animal Types", "Colors Canyon", "Life Cycle Garden"])
    await expect(page.getByRole("button", { name: "Visit " + land, exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Visit Animal Types", exact: true }).click();
  await expect(world).toHaveAttribute("data-camera-mode", "follow");
  await page.getByRole("button", { name: "Walk forward", exact: true }).click();
  await page.getByRole("button", { name: "Hop", exact: false }).click();
  await page.getByRole("button", { name: "View whole planet", exact: true }).click();
  await expect(world).toHaveAttribute("data-camera-mode", "globe");
  await page.getByRole("button", { name: "Visit Magnet Lands", exact: true }).click();
  await enterMagnetLab(page);
  await expect(page.getByRole("heading", { name: "Ask an adult to turn on the camera" })).toBeVisible();
  await expect(page.locator("[inert] canvas")).toBeAttached();
  await page.getByRole("button", { name: "Back to Science Planet", exact: true }).click();
  await expect(world.locator("canvas")).toBeVisible();
  await expect(world).toHaveAttribute("data-camera-mode", "follow");
  await expect(page.getByRole("button", { name: "Walk forward", exact: true })).toBeVisible();
});
