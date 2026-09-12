// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { WiggleExperience } from "../../components/wiggle/WiggleExperience";
import { useWorldStore } from "../../components/wiggle/worldStore";

vi.mock("../../components/mission/MissionAtlas", () => ({
  MissionAtlas: () => <div data-testid="mission-atlas">Mission Atlas</div>,
}));

const resetWorld = () => useWorldStore.setState({
  phase: "opening",
  selectedPlanetId: null,
  discoveredWonderIds: [],
  spaceLogOpen: false,
  reducedMotion: false,
});

describe("WiggleExperience", () => {
  beforeEach(resetWorld);
  afterEach(cleanup);

  it("shows one entry action and a meaningful logo alternative", () => {
    render(<WiggleExperience />);
    expect(screen.getAllByRole("button")).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Let's Wiggle" })).toBeTruthy();
    expect(screen.getByRole("img", { name: "Wiggle character mark" })).toBeTruthy();
  });

  it("moves from the opening into the hub", () => {
    render(<WiggleExperience />);
    fireEvent.click(screen.getByRole("button", { name: "Let's Wiggle" }));
    expect(useWorldStore.getState().phase).toBe("hub");
    expect(screen.getByRole("heading", { name: "Your learning universe is ready." })).toBeTruthy();
  });

  it("renders reduced-motion opening state without waiting for animation completion", () => {
    useWorldStore.getState().setReducedMotion(true);
    render(<WiggleExperience />);
    fireEvent.click(screen.getByRole("button", { name: "Let's Wiggle" }));
    expect(screen.getByRole("heading", { name: "Your learning universe is ready." })).toBeTruthy();
  });
});
