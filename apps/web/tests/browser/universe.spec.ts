import { expect, test, type Locator } from "@playwright/test";
import { launchNumeria } from "./helpers";

// Contrast of every matching text node against whatever is actually painted behind it. Translucent layers are
// composited from the outermost inwards over white, the brightest possible scene pixel, so the floor is conservative.
async function expectReadableSurface(surface: Locator, textSelector: string) {
  await expect(surface).toBeVisible();
  const measured = await surface.evaluate((element, selector) => {
    const rgb = (value: string) => value.match(/[\d.]+/g)!.map(Number);
    const luminance = (channels: number[]) => channels.map(channel => {
      const value = channel / 255;
      return value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4;
    }).reduce((total, value, index) => total + value * [.2126, .7152, .0722][index], 0);
    const behind = (node: Element) => {
      const layers: { colour: number[]; alpha: number }[] = [];
      for (let current: Element | null = node; current; current = current.parentElement) {
        const [r, g, b, alpha = 1] = rgb(getComputedStyle(current).backgroundColor);
        if (alpha > 0) layers.push({ colour: [r, g, b], alpha });
        if (alpha >= 1) break;
      }
      return layers.reverse().reduce((below, layer) => below.map((channel, index) => layer.colour[index] * layer.alpha + channel * (1 - layer.alpha)), [255, 255, 255]);
    };
    const nodes = [element, ...element.querySelectorAll(selector)].filter(node => {
      if (!node.matches(selector) || !node.textContent?.trim()) return false;
      // Screen-reader-only text is clipped to a pixel; there is nothing to read, so nothing to measure.
      const box = node.getBoundingClientRect();
      return box.width > 2 && box.height > 2;
    });
    return nodes.map(node => {
      const foreground = luminance(rgb(getComputedStyle(node).color).slice(0, 3));
      const background = luminance(behind(node));
      return { text: node.textContent!.trim().slice(0, 40), contrast: (Math.max(foreground, background) + .05) / (Math.min(foreground, background) + .05) };
    });
  }, textSelector);
  expect(measured.length).toBeGreaterThan(0);
  for (const text of measured) expect(text.contrast, `"${text.text}" against its own surface`).toBeGreaterThanOrEqual(4.5);
}

test("follow and mission HUD text keeps contrast above bright terrain", async ({ page }, info) => {
  await page.goto("/");
  await launchNumeria(page);
  await expect(page.locator("canvas")).toBeVisible({ timeout: 20_000 });
  await page.getByRole("button", { name: "Follow explorer", exact: true }).click();
  const back = page.getByRole("button", { name: "Back to Worlds", exact: true });
  const regions = page.getByRole("navigation", { name: "Numeria regions" });
  const card = page.getByRole("region", { name: "Fraction Forest details" });
  await expectReadableSurface(back, "button");
  await expectReadableSurface(regions, "button");
  await expectReadableSurface(card, "h1, p, button");
  await page.waitForTimeout(1600); // Allow the close-camera transition to settle for visual evidence.
  await page.screenshot({ path: info.outputPath("follow-hud.png") });
  await page.getByRole("button", { name: "Explore Fraction Forest", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Make three quarters", exact: true })).toBeVisible();
  await expectReadableSurface(page.getByRole("region", { name: "Fraction mission" }), "h2, p, button, span");
  await page.waitForTimeout(1600);
  await page.screenshot({ path: info.outputPath("mission-hud.png") });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("original world renders, camera controls work, and context loss preserves destinations", async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/");
  await launchNumeria(page);
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
  await page.getByRole("button", { name: "View whole planet", exact: true }).click();
  await page.locator("canvas").evaluate(canvas => {
    (canvas as HTMLCanvasElement).getContext("webgl2")!.getExtension("WEBGL_lose_context")!.loseContext();
  });
  await expect(page.getByRole("img", { name: /Numeria map/ })).toBeVisible();
  await page.getByRole("button", { name: "Visit Fraction Forest", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Fraction Forest", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Explore Fraction Forest", exact: true })).toBeVisible();
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
  await launchNumeria(page);
  await expect(page.getByRole("img", { name: /Numeria map/ })).toBeVisible();
  await page.getByRole("button", { name: "Visit Crystal Crater", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Crystal Crater", exact: true })).toBeVisible();
  // The selected region's instructions sit in its details card, readable without the 3D scene.
  await expect(page.getByRole("region", { name: "Crystal Crater details" }).getByText("Use the crystal groups to solve each number sentence.")).toBeVisible();
});

test("held cross-button input moves the rendered explorer and orbit/zoom change the view", async ({ page }) => {
  // Decorative motion is disabled so image changes must come from the exercised controls.
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await launchNumeria(page);
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
