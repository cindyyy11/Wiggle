import { expect, type Page } from "@playwright/test";
import { launchNumeria } from "../tests/browser/helpers";

export { keyboardActivate } from "../tests/browser/helpers";

export async function startMission(page: Page) {
  await page.goto("/");
  await launchNumeria(page);
  await expect(page.getByRole("button", { name: "Start fractions mission", exact: true })).toBeVisible();
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
