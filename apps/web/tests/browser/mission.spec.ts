import { expect, test } from "@playwright/test";
import { launchNumeria } from "./helpers";

test("the splash keeps the Wiggle logo moving until it auto-dismisses", async ({ page }) => {
  await page.goto("/");

  const brand = page.getByRole("img", { name: "Wiggle. Wonder. Wow!" });
  await expect(brand).toBeVisible();

  expect(await brand.evaluate(element => getComputedStyle(element).animationName)).not.toBe("none");
  expect(await brand.evaluate(element => getComputedStyle(element).animationIterationCount)).toBe("infinite");
  expect(await brand.evaluate(element => getComputedStyle(element).animationPlayState)).toBe("running");

  // Once it auto-dismisses the splash logo is gone and the Worlds screen takes over.
  await expect(brand).toBeHidden({ timeout: 10000 });
  await expect(page.getByRole("region", { name: "Choose a subject world" })).toBeVisible();
});

test("the splash disables its decorative logo motion for reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");

  const brand = page.getByRole("img", { name: "Wiggle. Wonder. Wow!" });
  await expect(brand).toBeVisible();
  expect(await brand.evaluate(element => getComputedStyle(element).animationName)).toBe("none");
});

for (const fallback of [false, true]) {
  test(`fraction mission completes in ${fallback ? "reduced-motion map" : "3D"}`, async ({ page }, testInfo) => {
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.route("**/api/backend/session/start", route => route.fulfill({ status: 503, body: "{}" }));
    if (fallback) {
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.addInitScript(() => {
        const original = HTMLCanvasElement.prototype.getContext;
        HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, ...args: Parameters<typeof original>) {
          if (String(args[0]).startsWith("webgl")) return null;
          return original.apply(this, args);
        } as typeof original;
      });
    }
    await page.goto("/");
    await launchNumeria(page);
    if (!fallback) await expect(page.locator("canvas")).toBeVisible({ timeout: 20000 });
    await page.getByRole("button", { name: "Explore Fraction Forest", exact: true }).click();
    await page.getByRole("button", { name: "2 of 4", exact: true }).click();
    await page.getByRole("button", { name: "I'm stuck", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Select three pizza slices", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Slice 1", exact: true })).toBeVisible();
    await expect(page.getByRole("group", { name: "Learning mode", exact: true })).toHaveCount(0);
    await page.screenshot({ path: testInfo.outputPath(`stuck-${fallback}.png`) });
    await page.getByRole("button", { name: "See my learning paths", exact: true }).click();
    await expect(page.getByTestId("prediction")).toHaveCount(3);
    await expect(page.getByTestId("prediction")).toHaveText(["43%", "68%", "87%"]);
    await page.screenshot({ path: testInfo.outputPath(`simulation-${fallback}.png`) });
    await page.getByRole("button", { name: "Try Gesture + Visual", exact: true }).click();
    for (const index of [1, 2, 3]) await page.getByRole("button", { name: `Slice ${index}`, exact: true }).click();
    await expect(page.getByText("3 of 4 slices selected")).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath(`pizza-${fallback}.png`) });
    await page.getByRole("button", { name: "Check my pizza", exact: true }).click();
    await expect(page.getByText("92%", { exact: true })).toBeVisible();
    await expect(page.getByText("+20 Wiggle Energy", { exact: true })).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath(`completion-${fallback}.png`) });
    await page.getByRole("button", { name: "Back to my universe", exact: true }).click();
    await expect(page.getByRole("button", { name: "Explore Fraction Forest", exact: true })).toBeFocused();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(errors).toEqual([]);
  });
}
