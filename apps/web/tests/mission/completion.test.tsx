// @vitest-environment jsdom
import React from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { MissionAtlas } from "../../components/mission/MissionAtlas";
import { EventQueue } from "../../features/events/eventQueue";
import type { GestureEvent } from "../../features/gestures/gestureClassifier";

const hand = vi.hoisted(() => ({ recognized: undefined as ((event: GestureEvent) => void) | undefined }));
vi.mock("next/dynamic", () => ({ default: () => () => null }));
vi.mock("../../features/gestures/useGestureControls", () => ({
  useGestureControls: (_enabled: boolean, onGesture: (event: GestureEvent) => void) => {
    hand.recognized = onGesture;
    return { video: { current: null }, status: "off" };
  },
}));
beforeEach(() => {
  localStorage.clear(); hand.recognized = undefined;
  Object.defineProperty(window, "matchMedia", { writable: true, value: () => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }) });
});
afterEach(cleanup);
const click = (name: string) => fireEvent.click(screen.getByRole("button", { name }));
const idle = () => waitFor(() => expect(screen.getByRole("region", { name: "Fraction mission" }).getAttribute("aria-busy")).toBe("false"));

it.each(["buttons", "stuck", "recognized", "removed", "unchanged-grab"])("records actual selected input for %s completion", async kind => {
  render(<MissionAtlas quality="fallback" />);
  click("Start fractions mission"); await screen.findByRole("heading", { name: "Make three quarters" });
  click(kind === "stuck" ? "I'm stuck" : "Gesture"); await idle();
  if (kind === "recognized" || kind === "removed") {
    act(() => hand.recognized!({ gesture: "point", x: .1, y: .5 }));
    if (kind === "removed") { click("Slice 1"); click("Slice 1"); }
  } else {
    click("Slice 1");
    if (kind === "unchanged-grab") act(() => hand.recognized!({ gesture: "fist", x: .1, y: .5 }));
  }
  click("Slice 2"); click("Slice 3"); click("Check my pizza");
  await screen.findByText("+20 Wiggle Energy");
  const completion = new EventQueue().entries().find(entry => entry.event.type === "mission_completed")!.event;
  expect(completion.payload).toMatchObject({
    intendedMode: kind === "stuck" ? "visual_gesture" : "gesture",
    mode: kind === "recognized" ? "gesture" : "visual",
    inputMethod: kind === "recognized" ? "gesture" : "buttons",
  });
});

it("offers a cancellable Reality Mission after completion and records one optional lifecycle", async () => {
  render(<MissionAtlas quality="fallback" />);
  click("Start fractions mission"); await screen.findByRole("heading", { name: "Make three quarters" });
  click("3 of 4"); fireEvent.click(screen.getByRole("button", { name: /Check my answer/ }));
  await screen.findByText("+20 Wiggle Energy");
  expect(screen.getByText(/This little mission is optional/)).toBeTruthy();
  expect(screen.getByRole("button", { name: /Back to my universe/ })).toBeTruthy();
  click("Try a Reality Mission"); await screen.findByRole("heading", { name: "A little mission around you" });
  click("Back without finishing");
  click("Try a Reality Mission"); await screen.findByRole("heading", { name: "A little mission around you" });
  click("I found my three quarters");
  expect(screen.getByText("You found three quarters around you, too.")).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Try a Reality Mission" })).toBeNull();
  expect(screen.getByText("+20 Wiggle Energy")).toBeTruthy();
  const types = new EventQueue().entries().map(entry => entry.event.type);
  expect(types.filter(kind => kind === "mission_completed")).toHaveLength(1);
  expect(types.filter(kind => kind === "reality_mission_started")).toHaveLength(1);
  expect(types.filter(kind => kind === "reality_mission_completed")).toHaveLength(1);
  expect(types.indexOf("reality_mission_started")).toBeGreaterThan(types.indexOf("mission_completed"));
});
