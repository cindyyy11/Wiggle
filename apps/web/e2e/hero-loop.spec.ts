import { expect, test } from "@playwright/test";
import { completeVisualMission, keyboardActivate, startMission } from "./helpers";

test("connected pointer loop persists the intervention and gives the parent an insight", async ({ page }, info) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.addInitScript(() => {
    Object.defineProperty(navigator.mediaDevices, "getUserMedia", { value: async () => { throw new DOMException("Denied", "NotAllowedError"); } });
  });
  await startMission(page);
  await page.getByRole("button", { name: "2 of 4", exact: true }).click();
  await page.getByRole("button", { name: "I'm stuck", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Select three pizza slices" })).toBeVisible();
  await page.getByRole("button", { name: "See my learning paths", exact: true }).click();
  await expect(page.getByTestId("prediction")).toHaveCount(3);
  await page.screenshot({ path: info.outputPath("connected-simulation.png") });
  // A camera denial must not prevent any step of the pointer-only completion.
  await page.getByRole("button", { name: "Try Gesture + Visual", exact: true }).click();
  for (const slice of [1, 2, 3]) await page.getByRole("button", { name: `Slice ${slice}`, exact: true }).click();
  const response = page.waitForResponse(value => value.url().endsWith("/session/complete") && value.status() === 200);
  await page.getByRole("button", { name: "Check my pizza", exact: true }).click();
  const outcome = await (await response).json();
  expect(outcome.actualSuccess).toBe(.92);
  expect(outcome.update.changes.length).toBeGreaterThan(0);
  expect(outcome.celebration.text.length).toBeGreaterThan(10);
  await expect(page.getByText("+20 Wiggle Energy", { exact: true })).toBeVisible();
  await page.screenshot({ path: info.outputPath("connected-completion.png") });
  await page.getByRole("button", { name: "Back to my universe", exact: true }).click();
  await expect(page.getByRole("button", { name: "Explore Fraction Forest", exact: true })).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});

test("keyboard-only navigation completes the connected mission in reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.getByRole("region", { name: "Choose a subject world" })).toBeVisible({ timeout: 10000 });
  await keyboardActivate(page, "Explore Numeria");
  await expect(page.getByRole("button", { name: "Explore Fraction Forest", exact: true })).toBeVisible();
  await keyboardActivate(page, "Explore Fraction Forest");
  await keyboardActivate(page, "Visual");
  for (const slice of [1, 2, 3]) await keyboardActivate(page, `Slice ${slice}`);
  const saved = page.waitForResponse(response => response.url().endsWith("/session/complete") && response.ok());
  await keyboardActivate(page, "Check my pizza");
  await saved;
  await keyboardActivate(page, "Back to my universe");
  await expect(page.getByRole("button", { name: "Explore Fraction Forest", exact: true })).toBeFocused();
});

test("the optional post-completion Reality Mission preserves the saved fraction result", async ({ page }, info) => {
  const { session, outcome } = await completeVisualMission(page);
  const accepted: { id: string; type: string }[] = [];
  page.on("response", response => {
    if (!response.url().endsWith("/events") || !response.ok()) return;
    const events = response.request().postDataJSON().events as { id: string; type: string; sessionId: string }[];
    accepted.push(...events.filter(event => event.sessionId === session.sessionId && event.type.startsWith("reality_mission_")));
  });
  await expect(page.getByText(/This little mission is optional/)).toBeVisible();
  await page.getByRole("button", { name: "Try a Reality Mission", exact: true }).click();
  await expect(page.getByRole("heading", { name: "A little mission around you" })).toBeVisible();
  await page.getByRole("button", { name: "Back without finishing", exact: true }).click();
  await page.getByRole("button", { name: "Try a Reality Mission", exact: true }).click();
  await expect(page.getByRole("heading", { name: "A little mission around you" })).toBeVisible();
  const saved = page.waitForResponse(response => response.url().endsWith("/events") && response.ok() &&
    response.request().postDataJSON().events.some((event: { type: string }) => event.type === "reality_mission_completed"));
  await page.getByRole("button", { name: "I found my three quarters", exact: true }).click();
  await saved;
  await expect(page.getByText("You found three quarters around you, too.")).toBeVisible();
  await expect(page.getByText("+20 Wiggle Energy", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Try a Reality Mission", exact: true })).toHaveCount(0);
  expect(accepted.map(event => event.type)).toEqual(["reality_mission_started", "reality_mission_completed"]);
  const after = await (await page.request.get(`http://127.0.0.1:8101/twin/${session.childId}`)).json();
  expect(after.twin).toEqual(outcome.update.twin);
  await page.screenshot({ path: info.outputPath("connected-reality-completed.png") });
  await page.getByRole("button", { name: "Back to my universe", exact: true }).click();
  await expect(page.getByRole("button", { name: "Explore Fraction Forest", exact: true })).toBeFocused();
});
