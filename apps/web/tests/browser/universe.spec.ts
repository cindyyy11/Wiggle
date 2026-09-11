import { expect, test, type Locator } from "@playwright/test";

async function expectReadableHud(surface: Locator, textSelector: string) {
  await expect(surface).toBeVisible();
  const measured = await surface.evaluate((element, selector) => {
    const rgb = (value: string) => value.match(/[\d.]+/g)!.map(Number);
    const backing = getComputedStyle(element, "::before");
    const [r, g, b, alpha = 1] = rgb(backing.backgroundColor);
    // White is the brightest possible scene pixel: a conservative terrain-independent floor.
    const background = [r, g, b].map(channel => channel * alpha + 255 * (1 - alpha));
    const luminance = (channels: number[]) => channels.map(channel => {
      const value = channel / 255;
      return value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4;
    }).reduce((total, value, index) => total + value * [.2126, .7152, .0722][index], 0);
    return {
      backing: backing.content !== "none" && backing.position === "absolute" && alpha > 0,
      text: [...element.querySelectorAll(selector)].map(node => {
        const foreground = luminance(rgb(getComputedStyle(node).color).slice(0, 3));
        const behind = luminance(background);
        return { text: node.textContent, contrast: (Math.max(foreground, behind) + .05) / (Math.min(foreground, behind) + .05) };
      }),
    };
  }, textSelector);
  expect(measured.backing).toBe(true);
  expect(measured.text.length).toBeGreaterThan(0);
  for (const text of measured.text) expect(text.contrast, `${text.text} against brightest terrain`).toBeGreaterThanOrEqual(4.5);
}

test("follow and mission HUD text keeps contrast above bright terrain", async ({ page }, info) => {
  await page.goto("/");
  await expect(page.locator("canvas")).toBeVisible({ timeout: 20_000 });
  await page.getByRole("button", { name: "Follow explorer", exact: true }).click();
  const title = page.getByRole("heading", { name: "Numeria", exact: true }).locator("..");
  const progress = page.getByLabel("Mission Atlas progress");
  await expectReadableHud(title, ":scope > span, h1, p");
  await expectReadableHud(progress, "span, strong, small");
  await expectReadableHud(page.getByLabel("Future worlds"), "span, small");
  await page.waitForTimeout(1600); // Allow the close-camera transition to settle for visual evidence.
  await page.screenshot({ path: info.outputPath("follow-hud.png") });
  await page.getByRole("button", { name: "Start fractions mission", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Make three quarters", exact: true })).toBeVisible();
  await expectReadableHud(title, ":scope > span, h1, p");
  await expectReadableHud(progress, "span, strong, small");
  await page.waitForTimeout(1600);
  await page.screenshot({ path: info.outputPath("mission-hud.png") });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

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
  await expect(page.getByRole("button", { name: "Start fractions mission", exact: true })).toBeVisible();
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
