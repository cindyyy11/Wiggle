import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { SCIENCE_ZONES } from "../../components/science/scienceWorld";
import { enterNumeria, enterScience, keyboardActivate, launchWiggle } from "./helpers";

const SUBJECT_PORTALS = ["Explore Numeria", "Explore Science Planet", "English (coming soon)", "Bahasa Melayu (coming soon)"] as const;

async function expectInteractiveOrbit(page: Page) {
  const orbit = page.getByTestId("subject-orbit");
  await expect(orbit).toHaveAttribute("data-quality", /^(high|low)$/);
  await expect(orbit).toHaveAttribute("data-reduced-motion", /^(true|false)$/);
  const canvas = orbit.locator("canvas");
  await expect(canvas).toBeVisible();
  await expect(canvas).toHaveCSS("pointer-events", "auto");
  for (const name of SUBJECT_PORTALS) {
    await expect(page.getByRole("button", { name, exact: true })).toBeVisible();
  }
}

async function expectOrbitAfterSplash(page: Page) {
  const orbit = page.getByTestId("subject-orbit");
  await expect(orbit).toHaveAttribute("data-quality", /^(high|low|fallback)$/);
  // Let a renderer failure settle before deciding whether this browser has a canvas.
  // Playwright's software Chrome can initially report WebGL support and then lose it
  // while React Three Fiber creates its renderer.
  await page.waitForTimeout(400);
  if (await orbit.getAttribute("data-quality") === "fallback") {
    await expect(orbit.locator("canvas")).toHaveCount(0);
    for (const name of SUBJECT_PORTALS) {
      await expect(page.getByRole("button", { name, exact: true })).toBeVisible();
    }
    return;
  }
  await expectInteractiveOrbit(page);
}

async function expectOrbitControlsFit(page: Page, testInfo: TestInfo) {
  for (const name of ["Explore Numeria", "Explore Science Planet"] as const) {
    const box = await page.getByRole("button", { name, exact: true }).boundingBox();
    expect(box).not.toBeNull();
    expect(box!.height).toBeGreaterThanOrEqual(44);
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(testInfo.project.use.viewport!.width);
    expect(box!.y + box!.height).toBeLessThanOrEqual(testInfo.project.use.viewport!.height);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath(`subject-orbit-${testInfo.project.name}.png`) });
}

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
  await expectOrbitAfterSplash(page);
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
  await expectOrbitAfterSplash(page);
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
  await expectOrbitAfterSplash(page);

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

test("reduced motion keeps the subject orbit interactive through Magnet Lab", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await launchWiggle(page);
  await expect(page.getByTestId("subject-orbit")).toHaveAttribute("data-reduced-motion", "true");
  await expectOrbitAfterSplash(page);
  await enterScience(page);
  await expect(page.getByRole("region", { name: "Science Planet" })).toHaveAttribute("data-reduced-motion", "true");
  await page.getByRole("button", { name: "Start Magnet Lab", exact: true }).click();

  await completeMagnetLab(page);
  await expect(page.getByText("Magnet Lab discovery complete.", { exact: true })).toBeVisible();
});

test("forced WebGL fallback keeps the subject orbit and all destinations usable", async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, ...args: Parameters<typeof original>) {
      if (String(args[0]).startsWith("webgl")) return null;
      return original.apply(this, args);
    } as typeof original;
  });
  await page.goto("/");
  await launchWiggle(page);
  const orbit = page.getByTestId("subject-orbit");
  await expect(orbit).toHaveAttribute("data-quality", "fallback");
  await expect(orbit.locator("canvas")).toHaveCount(0);
  for (const name of SUBJECT_PORTALS) {
    await expect(page.getByRole("button", { name, exact: true })).toBeVisible();
  }
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

test("orbit controls stay useful at desktop and mobile widths", async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await launchWiggle(page);
  await expect(page.getByTestId("subject-orbit")).toHaveAttribute("data-reduced-motion", "true");
  await expectOrbitAfterSplash(page);
  await expectOrbitControlsFit(page, testInfo);
});

test("keyboard navigation reaches splash, Numeria, and Science from the orbit", async ({ page }) => {
  await page.goto("/");
  await keyboardActivate(page, "Let's Wiggle");
  await keyboardActivate(page, "Explore Numeria");
  await expect(page.getByRole("button", { name: "Start fractions mission", exact: true })).toBeVisible();

  await page.goto("/");
  await keyboardActivate(page, "Let's Wiggle");
  await keyboardActivate(page, "Explore Science Planet");
  await keyboardActivate(page, "Start Magnet Lab");
  await expect(page.getByRole("region", { name: "Magnet Lab mission" })).toBeVisible();
});
