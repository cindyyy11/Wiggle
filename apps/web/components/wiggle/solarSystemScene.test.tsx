// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { SolarSystemHub } from "./SolarSystemHub";
import { travelDuration, travelProgress } from "./solarSystemMotion";
import { PLANETS } from "./worlds";
import { useWorldStore } from "./worldStore";

vi.mock("./solarSystemScene", () => ({
  SolarSystemScene: () => <div data-testid="solar-scene" />,
}));

const resetWorld = () => useWorldStore.setState({
  phase: "hub",
  selectedPlanetId: null,
  discoveredWonderIds: [],
  spaceLogOpen: false,
  reducedMotion: false,
});

describe("solar-system travel", () => {
  beforeEach(resetWorld);
  afterEach(() => { cleanup(); vi.useRealTimers(); });

  it("clamps progress and uses a short deterministic normal-motion duration", () => {
    const duration = travelDuration("lexicon", "numeria");
    expect(duration).toBeGreaterThanOrEqual(2_000);
    expect(duration).toBeLessThanOrEqual(4_000);
    expect(travelProgress("lexicon", "numeria", -30, false)).toBe(0);
    expect(travelProgress("lexicon", "numeria", duration / 2, false)).toBe(0.5);
    expect(travelProgress("lexicon", "numeria", duration * 2, false)).toBe(1);
  });

  it("completes travel immediately when reduced motion is enabled", () => {
    expect(travelProgress("lexicon", "numeria", 0, true)).toBe(1);
    useWorldStore.getState().setReducedMotion(true);
    const enter = vi.fn();
    render(<SolarSystemHub onEnterNumeria={enter} />);
    fireEvent.click(screen.getByRole("button", { name: "Enter Numeria" }));
    expect(enter).toHaveBeenCalledTimes(1);
  });

  it("updates the preview for every configured destination and only enters Numeria", () => {
    const enter = vi.fn();
    render(<SolarSystemHub onEnterNumeria={enter} />);

    for (const planet of PLANETS) {
      fireEvent.click(screen.getByRole("button", { name: new RegExp(`^${planet.label}`) }));
      expect(useWorldStore.getState()).toMatchObject({ phase: "preview", selectedPlanetId: planet.id });
      expect(screen.getByRole("heading", { name: planet.label })).toBeTruthy();
      if (planet.playable) expect(screen.getByRole("button", { name: "Enter Numeria" })).toBeTruthy();
      else {
        expect(screen.getByRole("button", { name: "Growing soon" }).hasAttribute("disabled")).toBe(true);
        expect(screen.queryByRole("button", { name: "Enter Numeria" })).toBeNull();
      }
    }
  });

  it("waits for the normal-motion flight before entering Numeria", () => {
    vi.useFakeTimers();
    const enter = vi.fn();
    render(<SolarSystemHub onEnterNumeria={enter} />);
    fireEvent.click(screen.getByRole("button", { name: "Enter Numeria" }));
    expect(screen.getByRole("status").textContent).toContain("Following the starlight");
    act(() => vi.advanceTimersByTime(travelDuration("numeria", "numeria") - 1));
    expect(enter).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(enter).toHaveBeenCalledTimes(1);
  });
});
