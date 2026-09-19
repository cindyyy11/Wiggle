// @vitest-environment jsdom
import React from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { ParentDashboard } from "../../components/parent/ParentDashboard";
import { parentRequest } from "../../lib/api/parent";

vi.mock("../../lib/api/parent", () => ({ parentRequest: vi.fn() }));

const insights = {
  childId: "child-1", completedMissions: 1,
  twin: {
    mastery: {}, initiationFriction: .5, persistenceFriction: .5, cognitiveLoad: .5, transitionFriction: .5, fatigueEstimate: .5,
    modalityEffectiveness: { visual: .5, voice: .5, gesture: .5, movement: .5, story: .5, text: .5 },
    strategyEffectiveness: { chunking: .5, movementBreak: .5, visualHint: .5, voiceHint: .5, choice: .5 },
  },
  insight: { text: "Try it together." },
};

function mockViewport(compact: boolean) {
  window.matchMedia = vi.fn().mockImplementation((media: string) => ({
    matches: compact, media, addEventListener: vi.fn(), removeEventListener: vi.fn(),
  })) as unknown as typeof window.matchMedia;
}

async function renderDashboard() {
  vi.mocked(parentRequest).mockImplementation(async path => {
    if (path === "children") return [{ id: "child-1", name: "Maya" }];
    if (path === "settings") return { breakIntervalMinutes: 20 };
    return insights;
  });
  await act(async () => { render(<ParentDashboard mode="household" onLock={vi.fn()} />); });
  await screen.findByText("Mission control");
}

afterEach(() => { cleanup(); vi.clearAllMocks(); Reflect.deleteProperty(window, "matchMedia"); });

it("shows break settings and both check-ins side by side on wide screens, with no tabs", async () => {
  mockViewport(false);
  await renderDashboard();
  expect(screen.queryByRole("tablist")).toBeNull();
  expect(screen.getByLabelText("Preferred minutes between breaks")).toBeTruthy();
  expect(screen.getByRole("button", { name: "Smooth" })).toBeTruthy();
  expect(screen.getByLabelText("Anything helpful to know?")).toBeTruthy();
});

it("shows one form at a time as tabs on narrow screens and keeps what was typed", async () => {
  mockViewport(true);
  await renderDashboard();
  expect(screen.getByRole("tablist", { name: "Share and settings" })).toBeTruthy();
  expect(screen.getByRole("tab", { name: "Break time" }).getAttribute("aria-selected")).toBe("true");
  expect(screen.getByLabelText("Preferred minutes between breaks")).toBeTruthy();
  expect(screen.queryByRole("textbox", { name: "Anything helpful to know?" })).toBeNull();

  fireEvent.click(screen.getByRole("tab", { name: "Homework" }));
  expect(screen.getByRole("textbox", { name: "Anything helpful to know?" })).toBeTruthy();
  fireEvent.change(screen.getByLabelText("Anything helpful to know?"), { target: { value: "Tired after school" } });
  expect(screen.queryByRole("spinbutton", { name: "Preferred minutes between breaks" })).toBeNull();

  fireEvent.click(screen.getByRole("tab", { name: "Break time" }));
  fireEvent.click(screen.getByRole("tab", { name: "Homework" }));
  expect((screen.getByLabelText("Anything helpful to know?") as HTMLTextAreaElement).value).toBe("Tired after school");
});

it("moves between tabs with the arrow keys", async () => {
  mockViewport(true);
  await renderDashboard();
  fireEvent.keyDown(screen.getByRole("tablist"), { key: "ArrowRight" });
  expect(screen.getByRole("tab", { name: "Today" }).getAttribute("aria-selected")).toBe("true");
  expect(screen.getByRole("button", { name: "Smooth" })).toBeTruthy();
  fireEvent.keyDown(screen.getByRole("tablist"), { key: "ArrowLeft" });
  expect(screen.getByRole("tab", { name: "Break time" }).getAttribute("aria-selected")).toBe("true");
});
