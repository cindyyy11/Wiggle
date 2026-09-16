// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MissionAtlas } from "../../components/mission/MissionAtlas";
import { EventQueue } from "../../features/events/eventQueue";
import { dispatchGesture } from "../../features/gestures/commands";
import { ApiClient } from "../../lib/api/client";
import { demoSession } from "../../lib/demo/seed";

vi.mock("next/dynamic", () => ({ default: () => () => null }));
const enterAtlas = async () => {
  await screen.findByRole("button", { name: "Start fractions mission" }, { timeout: 3000 });
};
beforeEach(() => {
  localStorage.clear();
  Object.defineProperty(window, "matchMedia", { writable: true, value: () => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }) });
});
afterEach(cleanup);

it("maps point/pinch, fist and open palm to the same accessible domain commands", () => {
  const commands = { selectSlice: vi.fn(), grabSlice: vi.fn(), summonLexi: vi.fn() };
  dispatchGesture({ gesture: "pinch", x: .1, y: .5 }, commands);
  dispatchGesture({ gesture: "point", x: .7, y: .5 }, commands);
  dispatchGesture({ gesture: "fist", x: 1, y: .5 }, commands);
  dispatchGesture({ gesture: "open_palm", x: .5, y: .5 }, commands);
  expect(commands.selectSlice.mock.calls).toEqual([[0, "gesture"], [2, "gesture"]]);
  expect(commands.grabSlice).toHaveBeenCalledWith(3, "gesture");
  expect(commands.summonLexi).toHaveBeenCalledOnce();
});

it("never requests camera for ordinary or automatic stuck support and denial never blocks selection", async () => {
  const camera = vi.fn().mockRejectedValue(new DOMException("Denied", "NotAllowedError"));
  Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: { getUserMedia: camera } });
  render(<MissionAtlas quality="fallback" />);
  await enterAtlas();
  fireEvent.click(screen.getByRole("button", { name: "Start fractions mission" }));
  await screen.findByRole("heading", { name: "Make three quarters" });
  expect(camera).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "I'm stuck" }));
  await waitFor(() => expect(screen.getByRole("region", { name: "Fraction mission" }).getAttribute("aria-busy")).toBe("false"));
  expect(camera).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "See my learning paths" }));
  await screen.findByText("43%");
  fireEvent.click(screen.getByRole("button", { name: "Try Gesture + Visual" }));
  await screen.findByText(/Camera access denied/);
  expect(camera).toHaveBeenCalledOnce();
  for (const index of [1, 2, 3]) fireEvent.click(screen.getByRole("button", { name: `Slice ${index}` }));
  fireEvent.click(screen.getByRole("button", { name: "Check my pizza" }));
  await screen.findByText("92%");
});

it("offers curated hints, reset and offline work without losing the fraction mission", async () => {
  render(<MissionAtlas quality="fallback" />);
  await enterAtlas();
  fireEvent.click(screen.getByRole("button", { name: "Start fractions mission" }));
  await screen.findByRole("heading", { name: "Make three quarters" });
  fireEvent.click(screen.getByRole("button", { name: "Visual" }));
  await waitFor(() => expect(screen.getByRole("region", { name: "Fraction mission" }).getAttribute("aria-busy")).toBe("false"));
  fireEvent.click(screen.getByRole("button", { name: "Slice 1" }));
  fireEvent.click(screen.getByRole("button", { name: "Ask Lexi" }));
  fireEvent.click(screen.getByRole("button", { name: "Give me a hint" }));
  await screen.findByText("Choose three equal slices. Leave one on the plate.");
  fireEvent.click(screen.getByRole("button", { name: "Take a learning reset" }));
  await screen.findByRole("heading", { name: "Reset Station" });
  fireEvent.click(screen.getByRole("button", { name: "I'm ready to return" }));
  expect(screen.getByText("1 of 4 slices selected")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Ask Lexi" }));
  fireEvent.click(screen.getByRole("button", { name: "Try a Reality Mission" }));
  await screen.findByRole("heading", { name: "A little mission around you" });
  fireEvent.click(screen.getByRole("button", { name: "I found my three quarters" }));
  expect(screen.getByText("1 of 4 slices selected")).toBeTruthy();
  const events = new EventQueue().entries().map(entry => entry.event.type);
  expect(events).toEqual(expect.arrayContaining(["hint_requested", "reset_started", "reset_completed", "reality_mission_started", "reality_mission_completed"]));
  expect(events).not.toContain("mission_completed");
});

it("uses typed Lexi requests and ignores delayed responses after leaving", async () => {
  const client = new ApiClient();
  vi.spyOn(client, "start").mockResolvedValue(demoSession("api-session"));
  vi.spyOn(client, "events").mockImplementation(async body => ({ acceptedEventIds: body.events.map(event => event.id) }));
  const lexi = vi.spyOn(client, "lexi").mockImplementation(() => new Promise(() => {}));
  render(<MissionAtlas quality="fallback" client={client} />);
  await enterAtlas();
  fireEvent.click(screen.getByRole("button", { name: "Start fractions mission" }));
  await screen.findByRole("heading", { name: "Make three quarters" });
  fireEvent.click(screen.getByRole("button", { name: "Ask Lexi" }));
  fireEvent.click(screen.getByRole("button", { name: "Give me a hint" }));
  await waitFor(() => expect(lexi).toHaveBeenCalledOnce());
  expect(lexi.mock.calls[0][0]).toEqual({ sessionId: "api-session", tool: "request_hint" });
  fireEvent.click(screen.getByRole("button", { name: "Leave mission" }));
  expect(lexi.mock.calls[0][2].aborted).toBe(true);
});

it.each(["telemetry", "lexi"] as const)("keeps hints and Reality Missions available when %s fails with queued API events", async failure => {
  const client = new ApiClient();
  vi.spyOn(client, "start").mockResolvedValue(demoSession("offline-api-session"));
  const events = vi.spyOn(client, "events").mockImplementation(async body => {
    if (failure === "telemetry") throw new TypeError("Network unavailable");
    return { acceptedEventIds: body.events.map(event => event.id) };
  });
  const lexi = vi.spyOn(client, "lexi").mockRejectedValue(new TypeError("Network unavailable"));
  render(<MissionAtlas quality="fallback" client={client} />);
  await enterAtlas();
  fireEvent.click(screen.getByRole("button", { name: "Start fractions mission" }));
  await screen.findByRole("heading", { name: "Make three quarters" });
  fireEvent.click(screen.getByRole("button", { name: "Ask Lexi" }));
  const originalIds = new EventQueue().entries().map(entry => entry.event.id);
  expect(originalIds.length).toBeGreaterThan(0);
  fireEvent.click(screen.getByRole("button", { name: "Give me a hint" }));
  await screen.findByText("Choose three equal slices. Leave one on the plate.");
  fireEvent.click(screen.getByRole("button", { name: "Try a Reality Mission" }));
  await screen.findByRole("heading", { name: "A little mission around you" });
  fireEvent.click(screen.getByRole("button", { name: "I found my three quarters" }));
  expect(screen.getByRole("heading", { name: "Make three quarters" })).toBeTruthy();
  expect(screen.queryByText("Let's try that again. Your puzzle is still here.")).toBeNull();
  const pending = new EventQueue().entries();
  expect(pending.every(entry => entry.transport === "api")).toBe(true);
  expect(pending.some(entry => entry.event.type === "mission_completed")).toBe(false);
  if (failure === "telemetry") {
    expect(pending.map(entry => entry.event.id)).toEqual(expect.arrayContaining(originalIds));
    expect(pending.map(entry => entry.event.type)).toEqual(expect.arrayContaining(["hint_requested", "reality_mission_started", "reality_mission_completed"]));
    expect(lexi).not.toHaveBeenCalled();
  } else expect(lexi).toHaveBeenCalledTimes(2);
  // Reconnect after the persisted retry deadline: replay the same queued evidence.
  events.mockClear().mockImplementation(async body => ({ acceptedEventIds: body.events.map(event => event.id) }));
  const replay = new EventQueue(localStorage, () => Date.now() + 60001);
  await replay.flush(client, new AbortController().signal, "offline-api-session");
  expect(events.mock.calls.flatMap(([body]) => body.events.map(event => event.id))).toEqual(expect.arrayContaining(pending.map(entry => entry.event.id)));
  expect(replay.entries()).toHaveLength(0);
});
