import { expect, type Page } from "@playwright/test";

export async function launchWiggle(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Let's Wiggle", exact: true }).click();
  await expect(page.getByRole("region", { name: "Choose a subject world" })).toBeVisible();
}

export async function enterScience(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Show Science Planet", exact: true }).click();
  await page.getByRole("button", { name: "Explore Science Planet", exact: true }).click();
  await expect(page.getByRole("region", { name: "Science Planet" })).toBeVisible();
}

export async function denyCamera(page: Page): Promise<void> {
  await page.addInitScript(() => {
    let calls = 0;
    Object.assign(window, { __magnetCameraCalls: () => calls });
    Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: {
      getUserMedia: () => { calls++; return Promise.reject(new DOMException("Denied", "NotAllowedError")); },
    } });
  });
}

export async function enterNumeria(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Explore Numeria", exact: true }).click();
  await expect(page.getByRole("region", { name: "Explore Numeria" })).toBeVisible();
}

export async function launchNumeria(page: Page): Promise<void> {
  await launchWiggle(page);
  await enterNumeria(page);
}

/** Exercise the actual tab sequence; no programmatic focus or pointer events. */
export async function keyboardActivate(page: Page, name: string): Promise<void> {
  const target = page.getByRole("button", { name, exact: true });
  await expect(target).toBeVisible();
  await expect(target).toBeEnabled();
  for (let step = 0; step < 70; step++) {
    if (await target.evaluate(element => element === document.activeElement)) {
      await page.keyboard.press("Enter");
      return;
    }
    await page.keyboard.press("Tab");
  }
  throw new Error(`Keyboard could not reach ${name}`);
}
