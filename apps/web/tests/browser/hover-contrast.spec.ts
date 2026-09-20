import { expect, test, type Page } from "@playwright/test";
import { enterNumeria, enterScience, launchWiggle } from "./helpers";

// Global `.universe button:hover` rules once out-ranked a button's own colours, leaving white text on a pale
// background. Hover every control in a planet and require readable text in that state.
const MIN_CONTRAST = 3.5;

async function hoveredContrast(page: Page) {
  return page.evaluate(() => {
    const parse = (value: string) => {
      const match = value.match(/rgba?\(([^)]+)\)/);
      if (!match) return [0, 0, 0, 0];
      const parts = match[1].split(/[ ,/]+/).filter(Boolean).map(Number);
      return [parts[0], parts[1], parts[2], parts[3] ?? 1];
    };
    const over = (top: number[], under: number[]) => [0, 1, 2].map(i => top[i] * top[3] + under[i] * (1 - top[3])).concat(1);
    const luminance = (c: number[]) => {
      const channel = (v: number) => { const s = v / 255; return s <= .03928 ? s / 12.92 : ((s + .055) / 1.055) ** 2.4; };
      return .2126 * channel(c[0]) + .7152 * channel(c[1]) + .0722 * channel(c[2]);
    };
    const control = [...document.querySelectorAll(":hover")].pop()?.closest("button, a");
    if (!control) return null;
    const chain: Element[] = [];
    for (let node: Element | null = control; node; node = node.parentElement) chain.unshift(node);
    let background = [8, 16, 34, 1];
    for (const node of chain) background = over(parse(getComputedStyle(node).backgroundColor), background);
    const text = over(parse(getComputedStyle(control).color), background);
    const [light, dark] = [luminance(text), luminance(background)].sort((a, b) => b - a);
    return { name: (control.textContent || control.getAttribute("aria-label") || "").trim().slice(0, 40), ratio: (light + .05) / (dark + .05) };
  });
}

async function expectReadableOnHover(page: Page, planet: string) {
  const controls = page.getByRole("region", { name: planet, exact: true }).locator("button:visible, a:visible");
  const count = await controls.count();
  expect(count).toBeGreaterThan(5);
  const unreadable: string[] = [];
  for (let index = 0; index < count; index++) {
    try {
      await page.mouse.move(2, 2);
      await controls.nth(index).hover({ timeout: 2000 });
      await page.waitForTimeout(350);
    } catch { continue; }
    const result = await hoveredContrast(page);
    if (result && result.ratio < MIN_CONTRAST) unreadable.push(`${result.name} (${result.ratio.toFixed(2)}:1)`);
  }
  expect(unreadable, `${planet} controls with unreadable hover text`).toEqual([]);
}

test.describe("hover states stay readable", () => {
  test.skip(({ isMobile }) => isMobile, "Hover needs a pointer");

  test("Numeria controls", async ({ page }) => {
    await page.goto("/");
    await launchWiggle(page);
    await enterNumeria(page);
    await expectReadableOnHover(page, "Explore Numeria");
  });

  test("Science planet controls", async ({ page }) => {
    await page.goto("/");
    await launchWiggle(page);
    await enterScience(page);
    await expectReadableOnHover(page, "Science Planet");
  });

  test("Science invitation buttons", async ({ page }) => {
    await page.goto("/");
    await launchWiggle(page);
    await enterScience(page);
    await page.getByRole("button", { name: "Visit Animal Types", exact: true }).click();
    const invitation = page.getByRole("button", { name: /Let’s explore/ });
    await expect(invitation).toBeVisible({ timeout: 25000 });
    await invitation.hover();
    await page.waitForTimeout(350);
    const result = await hoveredContrast(page);
    expect(result?.ratio ?? 0).toBeGreaterThanOrEqual(MIN_CONTRAST);
  });
});
