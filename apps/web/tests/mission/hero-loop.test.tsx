// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { MissionAtlas } from "../../components/mission/MissionAtlas";
import { EventQueue } from "../../features/events/eventQueue";
import { ApiClient } from "../../lib/api/client";
import { activity, demoSession } from "../../lib/demo/seed";
import type { SelectAdaptationResponse } from "@wiggle/contracts";

vi.mock("next/dynamic", () => ({ default: () => () => null }));
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
  await screen.findByRole("heading", { name: "Let's try another way" });
  fireEvent.click(screen.getByRole("button", { name: "Find my way" }));
  await screen.findByRole("heading", { name: "A few ways to explore" });
  expect(screen.getAllByTestId("prediction")).toHaveLength(3);
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
    expect(events.find(event => event.type === "mission_completed")?.payload).toMatchObject({ correctness: .92, mode: "visual_gesture", objective: "identify-three-quarters" });
  });
});
