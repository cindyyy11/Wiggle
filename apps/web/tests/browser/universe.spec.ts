import { expect, test } from "@playwright/test";

test("original world renders, camera controls work, and context loss preserves destinations", async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/");
  const universe = page.getByRole("region", { name: "Explore Numeria" });
  await expect(page.locator("canvas")).toBeVisible({ timeout: 20_000 });
  await expect(universe).toHaveAttribute("data-quality", /high|low/);
  await page.screenshot({ path: testInfo.outputPath("globe.png") });
  await page.getByRole("button", { name: "Follow explorer", exact: true }).click();
  await expect(universe).toHaveAttribute("data-camera-mode", "follow");
  await page.getByRole("button", { name: "Visit Geometry Ridge", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Geometry Ridge", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Hop", exact: true }).click();
  await page.getByRole("button", { name: "Walk forward", exact: true }).focus();
  await page.keyboard.down("ArrowUp");
  await page.keyboard.up("ArrowUp");
  await page.getByRole("button", { name: "Globe view", exact: true }).click();
  await page.locator("canvas").evaluate(canvas => {
    (canvas as HTMLCanvasElement).getContext("webgl2")!.getExtension("WEBGL_lose_context")!.loseContext();
  });
  await expect(page.getByRole("img", { name: /Numeria map/ })).toBeVisible();
  await page.getByRole("button", { name: "Visit Fraction Forest", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Fraction Forest", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Let's explore", exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("fallback.png") });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});

test("WebGL unavailable and reduced motion still expose the accessible map", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, ...args: Parameters<typeof original>) {
      if (String(args[0]).startsWith("webgl")) return null;
      return original.apply(this, args);
    } as typeof original;
  });
  await page.goto("/");
  await expect(page.getByRole("img", { name: /Numeria map/ })).toBeVisible();
  await page.getByRole("button", { name: "Visit Crystal Crater", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Crystal Crater", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "How to explore", exact: true }).click();
  await expect(page.getByRole("complementary", { name: "Exploration instructions" })).toBeVisible();
});

test("held cross-button input moves the rendered explorer and orbit/zoom change the view", async ({ page }) => {
  // Decorative motion is disabled so image changes must come from the exercised controls.
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const canvas = page.locator("canvas");
  await expect(canvas).toBeVisible({ timeout: 20_000 });
  await page.getByRole("button", { name: "Follow explorer", exact: true }).click();
  const hold = async (name: string) => {
    const box = await page.getByRole("button", { name, exact: true }).boundingBox();
    if (!box) throw new Error(`Missing ${name} button`);
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(450);
    await page.mouse.up();
  };
  await hold("Walk forward");
  const beforeRight = await canvas.screenshot();
  await hold("Walk right");
  const afterRight = await canvas.screenshot();
  expect(afterRight.equals(beforeRight)).toBe(false);
  await page.getByRole("button", { name: "Zoom in", exact: true }).click();
  const afterZoom = await canvas.screenshot();
  expect(afterZoom.equals(afterRight)).toBe(false);
  const box = await canvas.boundingBox();
  if (!box) throw new Error("Missing canvas");
  await page.mouse.move(box.width / 2, box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.width / 2 + 45, box.height / 2 + 20, { steps: 6 });
  await page.mouse.up();
  const afterOrbit = await canvas.screenshot();
  expect(afterOrbit.equals(afterZoom)).toBe(false);
});
