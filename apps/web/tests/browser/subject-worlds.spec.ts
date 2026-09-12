import { expect, test, type Page } from "@playwright/test";
import { SCIENCE_ZONES } from "../../components/science/scienceWorld";
import { enterNumeria, enterScience, keyboardActivate, launchWiggle } from "./helpers";

async function completeMagnetLab(page: Page) {
  for (const [object, answer] of [
    ["paper clip", "Attracted"],
    ["iron nail", "Attracted"],
    ["wooden block", "Not attracted"],
    ["plastic button", "Not attracted"],
  ]) {
    await page.getByRole("button", { name: `Test ${object}`, exact: true }).click();
    await page.getByRole("button", { name: "Try the magnet", exact: true }).click();
    await page.getByRole("button", { name: answer, exact: true }).click();
  }
}

test("splash, Worlds, Science, and Magnet Lab stay on a native-control path", async ({ page }) => {
  await page.goto("/");
  await launchWiggle(page);
  const sciencePortal = page.getByRole("button", { name: "Explore Science Planet", exact: true });
  await expect(sciencePortal).toBeVisible();
  await expect(sciencePortal).toBeEnabled();
  await enterScience(page);
  await page.getByRole("button", { name: "Start Magnet Lab", exact: true }).click();
  await expect(page.getByRole("region", { name: "Magnet Lab mission" })).toBeVisible();

  await completeMagnetLab(page);

  await expect(page.getByRole("region", { name: "Science Planet" })).toBeVisible();
  await expect(page.getByText("Magnet Lab discovery complete.", { exact: true })).toBeVisible();
  await expect(page.getByText(/\b(?:token|reward|claim)\b/i)).toHaveCount(0);
});

test("Worlds enters Numeria before the existing fractions mission", async ({ page }) => {
  await page.goto("/");
  await launchWiggle(page);
  await enterNumeria(page);

  await expect(page.getByRole("button", { name: "Start fractions mission", exact: true })).toBeVisible();
});

test("Parent navigation waits for a safe Maths close", async ({ page }) => {
  await page.goto("/");
  await launchWiggle(page);
  await enterNumeria(page);
  await page.getByRole("button", { name: "Start fractions mission", exact: true }).click();
  await expect(page.getByRole("region", { name: "Fraction mission" })).toBeVisible();

  await expect(page.getByRole("button", { name: "Parent mission control", exact: true })).toBeDisabled();
  await expect(page.getByRole("link", { name: "Parent mission control", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Leave mission", exact: true }).click();

  const parent = page.getByRole("link", { name: "Parent mission control", exact: true });
  await expect(parent).toHaveAttribute("href", "/parent");
  await parent.click();
  await expect(page.getByRole("heading", { name: "Parent mission control", exact: true })).toBeVisible();
});

test("locked subject worlds retain focus and do not open a fake lesson", async ({ page }) => {
  await page.goto("/");
  await launchWiggle(page);

  for (const [name, status] of [
    ["English (coming soon)", "English is coming soon"],
    ["Bahasa Melayu (coming soon)", "Bahasa Melayu is coming soon"],
  ]) {
    const locked = page.getByRole("button", { name, exact: true });
    await locked.focus();
    await locked.click();
    await expect(locked).toBeFocused();
    await expect(page.getByRole("status").filter({ hasText: status })).toBeVisible();
    await expect(page.getByRole("region", { name: "Choose a subject world" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Science Planet" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Start Magnet Lab", exact: true })).toHaveCount(0);
  }
});

test("a direct Science route restores its zone and retains its child through every topic selection", async ({ page }) => {
  await page.goto("/?child=child-123&world=science&zone=ph-lab");
  await page.getByRole("button", { name: "Let's Wiggle", exact: true }).click();
  await expect(page.getByRole("region", { name: "Science Planet" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Visit pH Lab", exact: true })).toHaveAttribute("aria-pressed", "true");

  for (const zone of SCIENCE_ZONES) {
    await page.getByRole("button", { name: `Visit ${zone.name}`, exact: true }).click();
    const url = new URL(page.url());
    expect(url.searchParams.get("child")).toBe("child-123");
    expect(url.searchParams.get("world")).toBe("science");
    expect(url.searchParams.get("zone")).toBe(zone.id);
  }
});

test("Science fits desktop and mobile widths while keeping the selected topic visible", async ({ page }, testInfo) => {
  await page.goto("/");
  await launchWiggle(page);
  await enterScience(page);

  const selectedTopic = page.getByRole("region", { name: "Magnet Lab details" });
  await expect(selectedTopic).toBeVisible();
  if (testInfo.project.name === "mobile") await expect(selectedTopic).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("reduced motion remains interactive through Magnet Lab", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await launchWiggle(page);
  await enterScience(page);
  await expect(page.getByRole("region", { name: "Science Planet" })).toHaveAttribute("data-reduced-motion", "true");
  await page.getByRole("button", { name: "Start Magnet Lab", exact: true }).click();

  await completeMagnetLab(page);
  await expect(page.getByText("Magnet Lab discovery complete.", { exact: true })).toBeVisible();
});

test("a forced WebGL fallback keeps Science usable and can return to Worlds", async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, ...args: Parameters<typeof original>) {
      if (String(args[0]).startsWith("webgl")) return null;
      return original.apply(this, args);
    } as typeof original;
  });
  await page.goto("/");
  await launchWiggle(page);
  await enterScience(page);
  await expect(page.getByRole("img", { name: "Science Planet map" })).toBeVisible();
  await page.getByRole("button", { name: "Start Magnet Lab", exact: true }).click();

  await completeMagnetLab(page);
  await page.getByRole("button", { name: "Back to Worlds", exact: true }).click();
  await expect(page.getByRole("region", { name: "Choose a subject world" })).toBeVisible();
});

test("keyboard navigation reaches splash, Science, and Magnet Lab without pointer input", async ({ page }) => {
  await page.goto("/");
  await keyboardActivate(page, "Let's Wiggle");
  await keyboardActivate(page, "Explore Science Planet");
  await keyboardActivate(page, "Start Magnet Lab");

  await expect(page.getByRole("region", { name: "Magnet Lab mission" })).toBeVisible();
});
