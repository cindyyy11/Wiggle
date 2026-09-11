import { expect, type Page } from "@playwright/test";

export async function startMission(page: Page) {
  await page.goto("/");
  const started = page.waitForResponse(response => response.url().endsWith("/session/start") && response.status() === 200);
  await page.getByRole("button", { name: "Start fractions mission", exact: true }).click();
  const session = await (await started).json() as { sessionId: string; childId: string };
  await expect(page.getByRole("heading", { name: "Make three quarters" })).toBeVisible();
  return session;
}

export async function completeVisualMission(page: Page) {
  const session = await startMission(page);
  await page.getByRole("button", { name: "Visual", exact: true }).click();
  for (const slice of [1, 2, 3]) await page.getByRole("button", { name: `Slice ${slice}`, exact: true }).click();
  const completed = page.waitForResponse(response => response.url().endsWith("/session/complete") && response.status() === 200);
  await page.getByRole("button", { name: "Check my pizza", exact: true }).click();
  const outcome = await (await completed).json();
  await expect(page.getByText("+20 Wiggle Energy", { exact: true })).toBeVisible();
  return { session, outcome };
}

/** Exercise the actual tab sequence; no programmatic focus or pointer events. */
export async function keyboardActivate(page: Page, name: string) {
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
