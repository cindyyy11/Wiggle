// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { LearnerTwin } from "@wiggle/contracts";
import { WiggleConstellation } from "./WiggleConstellation";

afterEach(cleanup);

const twin: LearnerTwin = {
  mastery: { fractions: 0.5 },
  initiationFriction: 0.5,
  persistenceFriction: 0.5,
  cognitiveLoad: 0.5,
  transitionFriction: 0.5,
  fatigueEstimate: 0.5,
  modalityEffectiveness: { visual: 0.85, voice: 0.5, gesture: 0.5, movement: 0.5, story: 0.5, text: 0.5 },
  strategyEffectiveness: { chunking: 0.5, movementBreak: 0.5, visualHint: 0.5, voiceHint: 0.5, choice: 0.5 },
};

describe("WiggleConstellation", () => {
  it("renders every star and marks Visual Explorer as unlocked", () => {
    render(<WiggleConstellation twin={twin} />);
    expect(screen.getAllByRole("button")).toHaveLength(8);
    expect(screen.getByRole("button", { name: /Visual Explorer: Pictures/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Voice Navigator: not discovered yet" })).toBeTruthy();
  });

  it("shows a description only after a star is selected, and never a percentage", () => {
    render(<WiggleConstellation twin={twin} />);
    expect(screen.queryByRole("status")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Visual Explorer/ }));
    const detail = screen.getByRole("status");
    expect(detail.textContent).toMatch(/Pictures/);
    expect(detail.textContent).not.toMatch(/%/);
  });

  it("flags newly unlocked stars for a celebratory cue", () => {
    render(<WiggleConstellation twin={twin} newlyUnlocked={new Set(["visual-explorer"])} />);
    expect(screen.getByText("Visual Explorer")).toBeTruthy();
    expect(screen.getByLabelText("Newly unlocked")).toBeTruthy();
  });

  it("unlocks Science Explorer from planet progress", () => {
    render(<WiggleConstellation twin={twin} planetProgress={{ scienceCompleted: 4, numeriaCompleted: 0 }} />);
    expect(screen.getByRole("button", { name: /Science Explorer: You explored all four Science lands/ })).toBeTruthy();
  });
});
