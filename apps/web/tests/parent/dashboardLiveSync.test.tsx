// @vitest-environment jsdom
import React from "react";
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { ParentDashboard } from "../../components/parent/ParentDashboard";
import { parentRequest } from "../../lib/api/parent";
import { publishWiggleLiveEvent } from "../../features/sync/wiggleLiveChannel";

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

afterEach(() => { cleanup(); vi.clearAllMocks(); });

it("shows a live notice and refreshes when this child's mission completes elsewhere", async () => {
  let insightCalls = 0;
  vi.mocked(parentRequest).mockImplementation(async path => {
    if (path === "children") return [{ id: "child-1", name: "Maya" }];
    if (path === "settings") return { breakIntervalMinutes: 20 };
    insightCalls++;
    return insights;
  });
  await act(async () => { render(<ParentDashboard mode="household" onLock={vi.fn()} />); });
  await screen.findByText("Mission control");
  const callsBefore = insightCalls;
  await act(async () => {
    publishWiggleLiveEvent({ type: "mission_completed", childId: "child-1", missionTitle: "Fraction Forest Mission 3", occurredAt: "2026-09-13T00:00:00Z" });
    await new Promise(resolve => setTimeout(resolve, 10));
  });
  expect(await screen.findByText(/Maya completed: Fraction Forest Mission 3/)).toBeTruthy();
  expect(insightCalls).toBeGreaterThan(callsBefore);
});

it("ignores a mission completion for a different child", async () => {
  vi.mocked(parentRequest).mockImplementation(async path => {
    if (path === "children") return [{ id: "child-1", name: "Maya" }];
    if (path === "settings") return { breakIntervalMinutes: 20 };
    return insights;
  });
  await act(async () => { render(<ParentDashboard mode="household" onLock={vi.fn()} />); });
  await screen.findByText("Mission control");
  await act(async () => {
    publishWiggleLiveEvent({ type: "mission_completed", childId: "someone-else", missionTitle: "Other Mission", occurredAt: "2026-09-13T00:00:00Z" });
    await new Promise(resolve => setTimeout(resolve, 10));
  });
  expect(screen.queryByText(/Other Mission/)).toBeNull();
});
