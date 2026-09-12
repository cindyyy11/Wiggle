import { expect, test } from "@playwright/test";
import { startMission } from "./helpers";

test("Gemini timeout reaches its authored fallback through the real API", async ({ page, request }) => {
  const before = await (await request.get("http://127.0.0.1:8101/__test/provider-failures")).json();
  await startMission(page);
  await page.getByRole("button", { name: "Ask Lexi", exact: true }).click();
  const hint = page.waitForResponse(response => response.url().endsWith("/lexi/chat") && response.ok());
  await page.getByRole("button", { name: "Give me a hint", exact: true }).click();
  const content = await (await hint).json();
  await expect(page.getByText(content.content.text, { exact: true })).toBeVisible();
  const after = await (await request.get("http://127.0.0.1:8101/__test/provider-failures")).json();
  expect(after.timeouts).toBeGreaterThan(before.timeouts);
  await expect(page.getByText(/TimeoutError|Gemini|API error/)).toHaveCount(0);
});

test("lost event acknowledgement replays the same IDs and completion survives reload", async ({ page }) => {
  let interrupted = true;
  const saved = new Set<string>();
  const repeated = new Set<string>();
  await page.route("**/api/backend/events", async route => {
    const events = route.request().postDataJSON().events as { id: string }[];
    const response = await route.fetch();
    expect(response.status()).toBe(200);
    for (const event of events) { if (saved.has(event.id)) repeated.add(event.id); saved.add(event.id); }
    if (interrupted) return route.abort("internetdisconnected");
    return route.fulfill({ response });
  });
  await startMission(page);
  await expect.poll(() => saved.size).toBeGreaterThan(0);
  await page.getByRole("button", { name: "3 of 4", exact: true }).click();
  await page.getByRole("button", { name: "Check my answer", exact: false }).click();
  await expect(page.getByText("+20 Wiggle Energy", { exact: true })).toBeVisible();
  const pending = await page.evaluate(() => JSON.parse(localStorage.getItem("wiggle.learning-events.v1")!).entries);
  expect(pending.some((entry: { event: { type: string } }) => entry.event.type === "mission_completed")).toBe(true);
  interrupted = false;
  const completion = page.waitForResponse(response => response.url().endsWith("/session/complete") && response.ok());
  await page.reload();
  await completion;
  await expect.poll(async () => page.evaluate(() => JSON.parse(localStorage.getItem("wiggle.learning-events.v1")!).entries.length)).toBe(0);
  expect(repeated.size).toBeGreaterThan(0);
});

test("camera denial and WebGL loss keep the connected pizza playable", async ({ page }, info) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator.mediaDevices, "getUserMedia", { value: async () => { throw new DOMException("Denied", "NotAllowedError"); } });
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, ...args: Parameters<typeof original>) {
      if (String(args[0]).startsWith("webgl")) return null;
      return original.apply(this, args);
    } as typeof original;
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
  const session = await startMission(page);
  const before = await (await page.request.get(`http://127.0.0.1:8101/twin/${session.childId}`)).json();
  await expect(page.getByRole("img", { name: /Numeria map/ })).toBeVisible();
  await page.getByRole("button", { name: "Gesture", exact: true }).click();
  await expect(page.getByText(/Camera unavailable/)).toBeVisible();
  for (const slice of [1, 2, 3]) await page.getByRole("button", { name: `Slice ${slice}`, exact: true }).click();
  await page.screenshot({ path: info.outputPath("connected-camera-webgl-fallback.png") });
  const completed = page.waitForResponse(response => response.url().endsWith("/session/complete") && response.ok());
  await page.getByRole("button", { name: "Check my pizza", exact: true }).click();
  const response = await completed;
  expect(response.request().postDataJSON().inputMethod).toBe("buttons");
  const outcome = await response.json();
  expect(outcome.update.twin.modalityEffectiveness.gesture).toBe(before.twin.modalityEffectiveness.gesture);
  expect(outcome.update.changes.some((change: { field: string }) => change.field === "modality_effectiveness.gesture")).toBe(false);
  expect(outcome.update.changes.find((change: { field: string }) => change.field === "modality_effectiveness.visual").evidence).toContain("intended=gesture input=buttons");
  await expect(page.getByText("+20 Wiggle Energy", { exact: true })).toBeVisible();
});
