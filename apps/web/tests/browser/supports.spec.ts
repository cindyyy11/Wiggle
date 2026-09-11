import { expect, test } from "@playwright/test";
import { demoSession } from "../../lib/demo/seed";

test("offline API telemetry does not block curated supports and replays after reconnect", async ({ page }) => {
  let online = false;
  const replayed: string[] = [];
  await page.route("**/api/backend/session/start", route => route.fulfill({ json: demoSession("offline-browser-session") }));
  await page.route("**/api/backend/lexi/chat", route => route.abort("internetdisconnected"));
  await page.route("**/api/backend/events", route => {
    if (!online) return route.abort("internetdisconnected");
    const { events } = route.request().postDataJSON() as { events: { id: string }[] };
    const ids = events.map(event => event.id); replayed.push(...ids);
    return route.fulfill({ json: { acceptedEventIds: ids } });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Start fractions mission", exact: true }).click();
  await page.getByRole("button", { name: "Ask Lexi", exact: true }).click();
  await page.getByRole("button", { name: "Give me a hint" }).click();
  await expect(page.getByText("Choose three equal slices. Leave one on the plate.")).toBeVisible();
  await page.getByRole("button", { name: "Try a Reality Mission" }).click();
  await expect(page.getByRole("heading", { name: "A little mission around you" })).toBeVisible();
  await page.getByRole("button", { name: "I found my three quarters" }).click();
  await expect(page.getByRole("heading", { name: "Make three quarters" })).toBeVisible();
  const queued = await page.evaluate(() => JSON.parse(localStorage.getItem("wiggle.learning-events.v1")!).entries as { transport: string; event: { id: string; type: string } }[]);
  expect(queued.every(entry => entry.transport === "api")).toBe(true);
  expect(queued.map(entry => entry.event.type)).toEqual(expect.arrayContaining(["task_started", "hint_requested", "reality_mission_started", "reality_mission_completed"]));
  online = true;
  await page.evaluate(() => window.dispatchEvent(new Event("online")));
  await expect.poll(async () => page.evaluate(() => JSON.parse(localStorage.getItem("wiggle.learning-events.v1")!).entries.length), { timeout: 10000 }).toBe(0);
  expect(replayed).toEqual(expect.arrayContaining(queued.map(entry => entry.event.id)));
});

test("opted-in camera runs local inference and stops every track on exit", async ({ page }) => {
  test.setTimeout(90000);
  const diagnostics: string[] = [];
  page.on("console", message => { if (message.type() === "error") diagnostics.push(message.text()); });
  page.on("requestfailed", request => diagnostics.push(`${request.url()}: ${request.failure()?.errorText}`));
  const requests: { url: string; method: string; body: string | null }[] = [];
  page.on("request", request => requests.push({ url: request.url(), method: request.method(), body: request.postData() }));
  await page.route("**/api/backend/session/start", route => route.fulfill({ status: 503, body: "{}" }));
  await page.addInitScript(() => {
    Object.defineProperty(navigator.mediaDevices, "getUserMedia", { value: async () => {
      const canvas = document.createElement("canvas"); canvas.width = 640; canvas.height = 480;
      const context = canvas.getContext("2d")!;
      const draw = setInterval(() => { context.fillStyle = "#335544"; context.fillRect(0, 0, 640, 480); }, 80);
      const stream = canvas.captureStream(12);
      document.documentElement.dataset.cameraCalls = String(Number(document.documentElement.dataset.cameraCalls || 0) + 1);
      for (const track of stream.getTracks()) {
        const stop = track.stop.bind(track);
        track.stop = () => { clearInterval(draw); stop(); document.documentElement.dataset.cameraStopped = "true"; };
      }
      return stream;
    } });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Start fractions mission", exact: true }).click();
  expect(requests.some(request => /mediapipe|hand_landmarker|vision_wasm/.test(request.url))).toBe(false);
  await expect(page.locator("html")).not.toHaveAttribute("data-camera-calls");
  await page.getByRole("button", { name: "Gesture", exact: true }).click();
  await expect(page.getByText(/Camera on · Processed only|Camera unavailable/)).toBeVisible({ timeout: 60000 });
  await expect(page.getByText(/Camera on · Processed only/), diagnostics.join("\n")).toBeVisible();
  await page.getByRole("button", { name: "Show camera preview" }).click();
  await expect(page.getByLabel("Local camera preview")).toBeVisible();
  await page.getByRole("button", { name: "Leave mission" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-camera-stopped", "true");
  expect(requests.filter(request => /mediapipe|hand_landmarker|vision_wasm/.test(request.url)).every(request => request.method === "GET" && request.body === null)).toBe(true);
  expect(requests.filter(request => request.body).every(request => request.url.includes("/api/backend/") && !/data:image|base64|landmarks|videoFrame/i.test(request.body!))).toBe(true);
});

test("camera denial preserves keyboard/touch play and accessible supports", async ({ page }, testInfo) => {
  const requests: { url: string; method: string; body: string | null }[] = [];
  page.on("request", request => requests.push({ url: request.url(), method: request.method(), body: request.postData() }));
  await page.route("**/api/backend/session/start", route => route.fulfill({ status: 503, body: "{}" }));
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => {
    Object.defineProperty(navigator.mediaDevices, "getUserMedia", { value: async () => { throw new DOMException("Denied", "NotAllowedError"); } });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Start fractions mission", exact: true }).click();
  await page.getByRole("button", { name: "Gesture", exact: true }).click();
  await expect(page.getByText(/Camera unavailable/)).toBeVisible();
  expect(requests.some(request => /mediapipe|hand_landmarker|vision_wasm/.test(request.url))).toBe(false);
  await page.getByRole("button", { name: "Slice 1", exact: true }).focus();
  await page.keyboard.press("Space");
  if (testInfo.project.name === "mobile") await page.getByRole("button", { name: "Slice 2", exact: true }).tap();
  else await page.getByRole("button", { name: "Slice 2", exact: true }).click();
  await expect(page.getByText("2 of 4 slices selected")).toBeVisible();
  await page.getByRole("combobox", { name: "Slice to grab" }).selectOption("2");
  await page.getByRole("button", { name: "Grab slice 3", exact: true }).click();
  await expect(page.getByText("3 of 4 slices selected")).toBeVisible();
  await page.getByRole("button", { name: "Ask Lexi", exact: true }).click();
  await expect(page.getByRole("heading", { name: "A little help from Lexi" })).toBeFocused();
  await page.getByRole("button", { name: "Give me a hint" }).click();
  await expect(page.getByText("Choose three equal slices. Leave one on the plate.")).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("lexi.png") });
  await page.getByRole("button", { name: "Take a learning reset" }).click();
  await expect(page.getByRole("heading", { name: "Reset Station" })).toBeFocused();
  await page.screenshot({ path: testInfo.outputPath("reset.png") });
  await page.getByRole("button", { name: "I'm ready to return" }).click();
  await page.getByRole("button", { name: "Ask Lexi", exact: true }).click();
  await page.getByRole("button", { name: "Try a Reality Mission" }).click();
  await page.screenshot({ path: testInfo.outputPath("reality.png") });
  await page.getByRole("button", { name: "I found my three quarters" }).click();
  await page.getByRole("button", { name: "Check my pizza" }).click();
  await expect(page.getByText("92%", { exact: true })).toBeVisible();
  expect(requests.filter(request => request.body).every(request => request.url.includes("/api/backend/") && !/data:image|base64|landmarks|videoFrame/i.test(request.body!))).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
