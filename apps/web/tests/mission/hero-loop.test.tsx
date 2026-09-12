// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { MissionAtlas } from "../../components/mission/MissionAtlas";
import { EventQueue } from "../../features/events/eventQueue";
import { ApiClient, ApiError } from "../../lib/api/client";
import { activity, demoSession, demoSimulation } from "../../lib/demo/seed";
import { emitLearningEvent } from "../../features/events/emitLearningEvent";
import type { SelectAdaptationResponse } from "@wiggle/contracts";

vi.mock("next/dynamic", () => ({ default: () => () => null }));

it("keeps household failures out of demo play and retains the session-start retry key", async () => {
  const client = new ApiClient();
  const start = vi.spyOn(client, "start").mockRejectedValue(new ApiError(503));
  render(<MissionAtlas quality="fallback" client={client} childId="owned-child" allowLocalFallback={false} />);
  fireEvent.click(screen.getByRole("button", { name: "Start fractions mission" }));
  await screen.findByRole("alert");
  expect(screen.queryByRole("heading", { name: "Make three quarters" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Start fractions mission" }));
  await waitFor(() => expect(start).toHaveBeenCalledTimes(2));
  expect(start.mock.calls[0][0]).toEqual({ childId: "owned-child" });
  expect(start.mock.calls[0][1]).toBe(start.mock.calls[1][1]);
  expect(new EventQueue().entries()).toEqual([]);
});
beforeEach(() => {
  localStorage.clear();
  Object.defineProperty(window, "matchMedia", { writable: true, value: () => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }) });
});

it("keeps the objective and selected slice controls available across all modes", async () => {
  render(<MissionAtlas quality="fallback" />);
  fireEvent.click(screen.getByRole("button", { name: "Start fractions mission" }));
  await screen.findByRole("heading", { name: "Make three quarters" });
  for (const mode of ["Visual", "Gesture", "Tiny steps", "Standard"]) {
    fireEvent.click(screen.getByRole("button", { name: mode }));
    await waitFor(() => expect(screen.getByRole("region", { name: "Fraction mission" }).getAttribute("aria-busy")).toBe("false"));
    expect(screen.getByRole("heading", { name: "Make three quarters" })).toBeTruthy();
    if (mode !== "Standard") {
      fireEvent.click(screen.getByRole("button", { name: "Slice 1" }));
      expect(screen.getByText("1 of 4 slices selected")).toBeTruthy();
    }
  }
  fireEvent.click(screen.getByRole("button", { name: "Check my answer" }));
  expect(screen.queryByText("92%")).toBeNull();
  expect(new EventQueue().entries().filter(entry => entry.event.type === "mission_completed")).toHaveLength(0);
});

it("aborts a pending adaptation when the child leaves, without restoring the old mission", async () => {
  const client = new ApiClient();
  vi.spyOn(client, "start").mockResolvedValue(demoSession("remote-session"));
  vi.spyOn(client, "events").mockImplementation(async body => ({ acceptedEventIds: body.events.map(event => event.id) }));
  let finish: (value: SelectAdaptationResponse) => void = () => {};
  const select = vi.spyOn(client, "select").mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  render(<MissionAtlas quality="fallback" client={client} />);
  fireEvent.click(screen.getByRole("button", { name: "Start fractions mission" }));
  await screen.findByRole("heading", { name: "Make three quarters" });
  fireEvent.click(screen.getByRole("button", { name: "Visual" }));
  await waitFor(() => expect(select).toHaveBeenCalledOnce());
  fireEvent.click(screen.getByRole("button", { name: "Leave mission" }));
  expect(select.mock.calls[0][2].aborted).toBe(true);
  finish({ interventionId: "intervention", strategy: "visual", mode: "visual", predictedSuccess: .68, activity });
  await waitFor(() => expect(screen.queryByRole("region", { name: "Fraction mission" })).toBeNull());
  expect(screen.queryByRole("region", { name: "Fraction mission" })).toBeNull();
  const events = new EventQueue().entries();
  expect(events.filter(entry => entry.event.type === "mission_abandoned")).toHaveLength(1);
  expect(events.filter(entry => entry.event.type === "mission_completed")).toHaveLength(0);
});
afterEach(cleanup);

it("completes the child hero loop through the accessible local world", async () => {
  render(<MissionAtlas quality="fallback" />);
  fireEvent.click(screen.getByRole("button", { name: "Start fractions mission" }));
  await screen.findByRole("heading", { name: "Make three quarters" });
  fireEvent.click(screen.getByRole("button", { name: "2 of 4" }));
  fireEvent.click(screen.getByRole("button", { name: "I'm stuck" }));
  expect(screen.getByRole("heading", { name: "Select three pizza slices" })).toBeTruthy();
  expect(screen.getByRole("button", { name: "Slice 1" })).toBeTruthy();
  expect(screen.queryByRole("group", { name: "Learning mode" })).toBeNull();
  await waitFor(() => expect(screen.getByRole("region", { name: "Fraction mission" }).getAttribute("aria-busy")).toBe("false"));
  fireEvent.click(screen.getByRole("button", { name: "See my learning paths" }));
  await screen.findByRole("heading", { name: "A few ways to explore" });
  expect(screen.getAllByTestId("prediction").map(element => element.textContent)).toEqual(["43%", "68%", "87%"]);
  fireEvent.click(screen.getByRole("button", { name: "Try Gesture + Visual" }));
  await screen.findByText("Your pizza is ready.");
  expect(screen.getByRole("region", { name: "Explore Numeria" }).getAttribute("data-camera-mode")).toBe("mission");
  for (const slice of [1, 2, 3]) fireEvent.click(screen.getByRole("button", { name: `Slice ${slice}` }));
  expect(screen.getByText("3 of 4 slices selected")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Check my pizza" }));
  await screen.findByText("92%");
  expect(screen.getByText("+20 Wiggle Energy")).toBeTruthy();
  await waitFor(() => {
    const events = new EventQueue().entries().map(entry => entry.event);
    expect(events.map(event => event.type)).toEqual(expect.arrayContaining(["task_started", "first_interaction", "stuck_requested", "mission_completed"]));
    expect(events.find(event => event.type === "mission_completed")?.payload).toMatchObject({ correctness: .92, mode: "visual", intendedMode: "visual_gesture", inputMethod: "buttons", objective: "identify-three-quarters" });
  });
});

it("finishes directly from immediate stuck support without visiting simulation", async () => {
  render(<MissionAtlas quality="fallback" />);
  fireEvent.click(screen.getByRole("button", { name: "Start fractions mission" }));
  await screen.findByRole("heading", { name: "Make three quarters" });
  fireEvent.click(screen.getByRole("button", { name: "Visual" }));
  await waitFor(() => expect(screen.getByRole("region", { name: "Fraction mission" }).getAttribute("aria-busy")).toBe("false"));
  fireEvent.click(screen.getByRole("button", { name: "Slice 1" }));
  fireEvent.click(screen.getByRole("button", { name: "I'm stuck" }));
  expect(screen.getByRole("heading", { name: "Select three pizza slices" })).toBeTruthy();
  expect(screen.getByText("1 of 4 slices selected")).toBeTruthy();
  for (const index of [2, 3]) fireEvent.click(screen.getByRole("button", { name: `Slice ${index}` }));
  await waitFor(() => expect(screen.getByRole("region", { name: "Fraction mission" }).getAttribute("aria-busy")).toBe("false"));
  fireEvent.click(screen.getByRole("button", { name: "Check my pizza" }));
  await screen.findByText("92%");
  expect(screen.queryByTestId("prediction")).toBeNull();
});

it("allows a fresh API session to simulate, adapt and complete despite an old rejected session", async () => {
  emitLearningEvent(new EventQueue(), demoSession("old"), { kind: "task_started" }, "api");
  const client = new ApiClient();
  vi.spyOn(client, "start").mockResolvedValue(demoSession("fresh"));
  vi.spyOn(client, "events").mockImplementation(async body => {
    if (body.events[0].sessionId === "old") throw new ApiError(404);
    return { acceptedEventIds: body.events.map(event => event.id) };
  });
  const simulate = vi.spyOn(client, "simulate").mockResolvedValue(demoSimulation);
  const select = vi.spyOn(client, "select").mockResolvedValue({ interventionId: "new", strategy: "visual_gesture", mode: "visual_gesture", predictedSuccess: .87, activity });
  const complete = vi.spyOn(client, "complete").mockResolvedValue({} as never);
  render(<MissionAtlas quality="fallback" client={client} />);
  fireEvent.click(screen.getByRole("button", { name: "Start fractions mission" }));
  await screen.findByRole("heading", { name: "Make three quarters" });
  fireEvent.click(screen.getByRole("button", { name: "I'm stuck" }));
  await waitFor(() => expect(screen.getByRole("region", { name: "Fraction mission" }).getAttribute("aria-busy")).toBe("false"));
  fireEvent.click(screen.getByRole("button", { name: "See my learning paths" }));
  await screen.findByText("43%");
  expect(simulate).toHaveBeenCalledWith({ sessionId: "fresh" }, expect.any(AbortSignal));
  fireEvent.click(screen.getByRole("button", { name: "Try Gesture + Visual" }));
  await waitFor(() => expect(screen.getByRole("region", { name: "Fraction mission" }).getAttribute("aria-busy")).toBe("false"));
  for (const index of [1, 2, 3]) fireEvent.click(screen.getByRole("button", { name: `Slice ${index}` }));
  fireEvent.click(screen.getByRole("button", { name: "Check my pizza" }));
  await waitFor(() => expect(complete).toHaveBeenCalledOnce());
  expect(select).toHaveBeenCalledTimes(2);
  expect(new EventQueue().entries().find(entry => entry.event.sessionId === "old")?.quarantined).toBe(404);
});
