// @vitest-environment jsdom
import React from "react";
import { act, cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { ParentDashboard } from "../../components/parent/ParentDashboard";
import { parentRequest } from "../../lib/api/parent";

vi.mock("../../lib/api/parent", () => ({ parentRequest: vi.fn() }));

const twin = {
  mastery: { "identify-three-quarters": 0.62, "compare-fractions": 0.3 },
  initiationFriction: 0.3, persistenceFriction: 0.4, cognitiveLoad: 0.45, transitionFriction: 0.35, fatigueEstimate: 0.85,
  modalityEffectiveness: { visual: 0.82, voice: 0.55, gesture: 0.74, movement: 0.48, story: 0.66, text: 0.4 },
  strategyEffectiveness: { chunking: 0.7, movementBreak: 0.52, visualHint: 0.78, voiceHint: 0.45, choice: 0.6 },
};
const insights = {
  childId: "child-1", completedMissions: 3, twin,
  insight: { text: "Try dividing a snack into four equal parts." },
  missions: [{ title: "Pizza Fractions", objective: "identify-three-quarters" }, { title: "Bigger or Smaller?", objective: "compare-fractions" }],
  masteryHistory: [{ label: "Mission 1", value: 0.2 }, { label: "Mission 2", value: 0.62 }],
  independenceHistory: [{ label: "Mission 1", value: 0 }, { label: "Mission 2", value: 1 }, { label: "Mission 3", value: 1 }],
  today: { missionsCompleted: 2, independentMissions: 1, helpRequests: 1, resetBreaks: 1, learningMinutes: 18, offlineMinutes: 10 },
};

afterEach(() => { cleanup(); vi.clearAllMocks(); window.localStorage.clear(); });

async function renderWith(data: unknown) {
  vi.mocked(parentRequest).mockImplementation(async path => {
    if (path === "children") return [{ id: "child-1", name: "Maya" }];
    if (path === "settings") return { breakIntervalMinutes: 20 };
    return data;
  });
  await act(async () => { render(<ParentDashboard mode="household" onLock={vi.fn()} />); });
  await screen.findByText("Mission control");
}

it("leads the overview with what happened today, in plain English, without repeating numbers", async () => {
  await renderWith(insights);
  expect(await screen.findByRole("heading", { name: "Maya finished 2 missions today" })).toBeTruthy();
  const chips = screen.getByRole("list", { name: "Today's activity" });
  expect(chips.textContent).toContain("18 min learning");
  expect(chips.textContent).toContain("10 min offline");
  expect(chips.textContent).toContain("1 reset break");
  expect(chips.textContent).toContain("1 help request");
  expect(screen.getByText("Try dividing a snack into four equal parts.")).toBeTruthy();
  expect(screen.getByRole("heading", { name: "3 completed missions" })).toBeTruthy();
});

it("shows friendly skill names with a level, never a raw objective id", async () => {
  await renderWith(insights);
  expect(document.body.textContent).not.toContain("compare-fractions");
  expect(document.body.textContent).not.toContain("identify-three-quarters");
  const mastery = screen.getByRole("heading", { name: "Mastery today" }).closest("article")!;
  expect(within(mastery).getByText("Comparing fractions")).toBeTruthy();
  expect(within(mastery).getByText("Just starting")).toBeTruthy();
  expect(within(mastery).getByText("Growing")).toBeTruthy();
});

it("tells the parent how the child is feeling and offers one practical tip", async () => {
  await renderWith(insights);
  const card = screen.getByRole("article", { name: "How Maya is feeling" });
  expect(within(card).getByText("Energy")).toBeTruthy();
  expect(within(card).getByText("Tired")).toBeTruthy();
  expect(card.textContent).toMatch(/movement break/);
  expect(card.textContent).not.toMatch(/\d+%/);
});

it("draws trends with a readable summary and keeps the numbers available as text", async () => {
  await renderWith(insights);
  expect(screen.getByText("Up 42 points since Mission 1")).toBeTruthy();
  expect(screen.getByText("Independent in 2 of 3 recent missions")).toBeTruthy();
  // The chart tooltip and the hidden text list both carry the value.
  expect(screen.getAllByText("Mission 2: 62%").length).toBeGreaterThan(0);
});

it("stays friendly when there is nothing to show yet", async () => {
  await renderWith({ ...insights, completedMissions: 0, missions: [], masteryHistory: [], independenceHistory: [], twin: { ...twin, mastery: {}, fatigueEstimate: 0.1 }, today: undefined });
  expect(await screen.findByRole("heading", { name: "Maya is ready for a first mission" })).toBeTruthy();
  expect(screen.getAllByText(/A trend will appear after completed missions/)).toHaveLength(2);
  expect(screen.getByText("Mastery appears after the first completed mission.")).toBeTruthy();
  expect(screen.getByText("No completed missions yet")).toBeTruthy();
  // No missions means no evidence, so neutral defaults must not be shown as "how they feel".
  const feeling = screen.getByRole("article", { name: "How Maya is feeling" });
  expect(within(feeling).queryByText("Energy")).toBeNull();
  expect(feeling.textContent).toContain("will appear after the first mission");
});
