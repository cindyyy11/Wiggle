import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { SCIENCE_ZONES } from "../../components/science/scienceWorld";
import { acceptScienceInvitation, denyCamera, enterMagnetLab, enterNumeria, enterScience, keyboardActivate, launchWiggle } from "./helpers";

const CAROUSEL_ARROWS = ["Previous planet", "Next planet"] as const;

async function expectInteractiveOrbit(page: Page) {
  const orbit = page.getByTestId("subject-orbit");
  await expect(orbit).toHaveAttribute("data-quality", /^(high|low)$/);
  await expect(orbit).toHaveAttribute("data-reduced-motion", /^(true|false)$/);
  const canvas = orbit.locator("canvas");
  await expect(canvas).toBeVisible();
  await expect(canvas).toHaveCSS("pointer-events", "auto");
  for (const name of CAROUSEL_ARROWS) {
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
    for (const name of CAROUSEL_ARROWS) {
      await expect(page.getByRole("button", { name, exact: true })).toBeVisible();
    }
    return;
  }
  await expectInteractiveOrbit(page);
}

async function expectOrbitControlsFit(page: Page, testInfo: TestInfo) {
  for (const name of CAROUSEL_ARROWS) {
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

function boxesIntersect(a: { x: number; y: number; width: number; height: number }, b: { x: number; y: number; width: number; height: number }) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

async function expectCarouselClearsTwinLauncher(page: Page, testInfo: TestInfo) {
  if (testInfo.project.name !== "mobile") return;
  const twinLauncher = page.locator('button[aria-expanded]:not([data-nextjs-dev-tools-button])');
  const twinBox = await twinLauncher.boundingBox();
  expect(twinBox).not.toBeNull();

  for (const name of CAROUSEL_ARROWS) {
    const arrow = page.getByRole("button", { name, exact: true });
    const arrowBox = await arrow.boundingBox();
    expect(arrowBox).not.toBeNull();
    expect(arrowBox!.width).toBeGreaterThanOrEqual(44);
    expect(arrowBox!.height).toBeGreaterThanOrEqual(44);
    expect(boxesIntersect(arrowBox!, twinBox!)).toBe(false);
  }

  await page.getByRole("button", { name: "Next planet", exact: true }).click();
  await page.getByRole("button", { name: "Next planet", exact: true }).click();
  await page.getByRole("button", { name: "Next planet", exact: true }).click();
  const locked = page.getByRole("button", { name: "??? (coming soon)", exact: true });
  await expect(locked).toBeVisible();
  expect(await locked.evaluate(button => {
    const rect = button.getBoundingClientRect();
    const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
    return hit === button || button.contains(hit);
  })).toBe(true);
}

async function expectCameraHelpAndExit(page: Page) {
  await expect(page.getByRole("heading", { name: "Ask an adult to turn on the camera" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Use hand gestures|Try the magnet|Test paper clip|Not attracted/ })).toHaveCount(0);
  await page.getByRole("button", { name: "Back to Science Planet", exact: true }).click();
}

test.beforeEach(async ({ page }) => { await denyCamera(page); });

test("splash, Worlds, Science, and Magnet Lab stay on a native-control path", async ({ page }) => {
  await page.goto("/");
  await launchWiggle(page);
  await expectOrbitAfterSplash(page);
  await page.getByRole("button", { name: "Next planet", exact: true }).click();
  const sciencePortal = page.getByRole("button", { name: "Explore Science Planet", exact: true });
  await expect(sciencePortal).toBeVisible();
  await expect(sciencePortal).toBeEnabled();
  await sciencePortal.click();
  await expect(page.getByRole("region", { name: "Science Planet" })).toBeVisible();
  await enterMagnetLab(page);
  await expect(page.getByRole("region", { name: "Magnet Lab mission" })).toBeVisible();

  await expectCameraHelpAndExit(page);

  await expect(page.getByRole("region", { name: "Science Planet" })).toBeVisible();
  await expect(page.getByText("Magnet Lab discovery complete.", { exact: true })).toHaveCount(0);
  await expect(page.getByText(/\b(?:token|reward|claim)\b/i)).toHaveCount(0);
});

test("Worlds enters Numeria before the existing fractions mission", async ({ page }) => {
  await page.goto("/");
  await launchWiggle(page);
  await expectOrbitAfterSplash(page);
  await enterNumeria(page);

  await expect(page.getByRole("button", { name: "Explore Fraction Forest", exact: true })).toBeVisible();
});

test("Parent navigation waits for a safe Maths close", async ({ page }) => {
  await page.goto("/");
  await launchWiggle(page);
  await enterNumeria(page);
  await page.getByRole("button", { name: "Explore Fraction Forest", exact: true }).click();
  await expect(page.getByRole("region", { name: "Fraction mission" })).toBeVisible();

  await expect(page.getByRole("button", { name: "Parent mission control", exact: true })).toBeDisabled();
  await expect(page.getByRole("link", { name: "Parent mission control", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Leave mission", exact: true }).click();

  const parent = page.getByRole("link", { name: "Parent mission control", exact: true });
  await expect(parent).toHaveAttribute("href", "/parent");
  await parent.click();
  await expect(page.getByRole("heading", { name: "Parent mission control", exact: true })).toBeVisible();
});

test("locked subject worlds stay disabled and do not open a fake lesson", async ({ page }) => {
  await page.goto("/");
  await launchWiggle(page);
  await expectOrbitAfterSplash(page);

  await page.getByRole("button", { name: "Next planet", exact: true }).click();
  for (let step = 0; step < 2; step++) {
    await page.getByRole("button", { name: "Next planet", exact: true }).click();
    const locked = page.getByRole("button", { name: "??? (coming soon)", exact: true });
    await expect(locked).toBeDisabled();
    await expect(page.getByText("More adventures are on their way.")).toBeVisible();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole("region", { name: "Choose a subject world" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Science Planet" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Start Magnet Lab", exact: true })).toHaveCount(0);
  }
});

test("a direct Science route restores its zone and retains its child through every topic selection", async ({ page }) => {
  await page.goto("/?child=child-123&world=science&zone=colors");
  await expect(page.getByRole("region", { name: "Science Planet" })).toBeVisible({ timeout: 10000 });
  await expect(page.getByRole("button", { name: "Visit Colors Canyon", exact: true })).toHaveAttribute("aria-pressed", "true");

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

  const selectedTopic = page.getByRole("region", { name: "Magnet Lands details" });
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
  await enterMagnetLab(page);

  await expectCameraHelpAndExit(page);
  await expect(page.getByText("Magnet Lab discovery complete.", { exact: true })).toHaveCount(0);
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
  for (const name of CAROUSEL_ARROWS) {
    await expect(page.getByRole("button", { name, exact: true })).toBeVisible();
  }
  await enterScience(page);
  await expect(page.getByText("3D view unavailable. Your Science checkpoints are still ready below.")).toBeVisible();
  await enterMagnetLab(page);

  await expectCameraHelpAndExit(page);
  await page.getByRole("button", { name: "Back to Worlds", exact: true }).click();
  await expect(page.getByRole("region", { name: "Choose a subject world" })).toBeVisible();
});

test("keyboard navigation reaches Science and Magnet Lab past the auto-dismissing splash without pointer input", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("region", { name: "Choose a subject world" })).toBeVisible({ timeout: 10000 });
  await keyboardActivate(page, "Next planet");
  await keyboardActivate(page, "Explore Science Planet");
  await keyboardActivate(page, "Explore Magnet Lands");
  await acceptScienceInvitation(page, true);

  await expect(page.getByRole("region", { name: "Magnet Lab mission" })).toBeVisible();
});

test("orbit controls stay useful at desktop and mobile widths", async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await launchWiggle(page);
  await expect(page.getByTestId("subject-orbit")).toHaveAttribute("data-reduced-motion", "true");
  await expectOrbitAfterSplash(page);
  await expectOrbitControlsFit(page, testInfo);
  await expectCarouselClearsTwinLauncher(page, testInfo);

  const nextPlanet = page.getByRole("button", { name: "Next planet", exact: true });
  await nextPlanet.hover();
  await expect(nextPlanet).toHaveCSS("transform", "none");
  await page.mouse.down();
  await expect(nextPlanet).toHaveCSS("transform", "none");
  await page.mouse.up();

  const enterWorld = page.getByRole("button", { name: /Explore Numeria|Explore Science Planet|\?\?\? \(coming soon\)/, exact: true });
  await enterWorld.hover();
  await expect(enterWorld).toHaveCSS("transform", "none");
});

test("keyboard navigation reaches Numeria and Science from the orbit past the auto-dismissing splash", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("region", { name: "Choose a subject world" })).toBeVisible({ timeout: 10000 });
  await keyboardActivate(page, "Explore Numeria");
  await expect(page.getByRole("button", { name: "Explore Fraction Forest", exact: true })).toBeVisible();

  await page.goto("/");
  await expect(page.getByRole("region", { name: "Choose a subject world" })).toBeVisible({ timeout: 10000 });
  await keyboardActivate(page, "Next planet");
  await keyboardActivate(page, "Explore Science Planet");
  await keyboardActivate(page, "Explore Magnet Lands");
  await acceptScienceInvitation(page, true);
  await expect(page.getByRole("region", { name: "Magnet Lab mission" })).toBeVisible();
});
