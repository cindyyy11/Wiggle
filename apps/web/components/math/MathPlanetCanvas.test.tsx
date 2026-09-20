// @vitest-environment jsdom
import React from "react";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import type { UniverseCanvasProps } from "../universe/UniverseCanvas";
import { LANDMARKS } from "../universe/world";
import { MATH_ACTIVITIES, type MathActivity, type MathRegionId } from "./mathActivities";
import { MathPlanet } from "./MathPlanet";
import { MathPlanetCanvas } from "./MathPlanetCanvas";

const state = vi.hoisted(() => ({ props: {} as UniverseCanvasProps }));
vi.mock("../universe/UniverseCanvas", () => ({
  UniverseCanvas: (props: UniverseCanvasProps) => {
    state.props = props;
    return <section aria-label="Mock Numeria scene">{props.hud}</section>;
  },
}));

afterEach(cleanup);
const regions = LANDMARKS.filter((landmark) => landmark.id !== "lexi");

it("labels the planet and starts at Fraction Forest with the math globe", () => {
  render(<MathPlanet onBackToWorlds={vi.fn()} quality="fallback" reducedMotion />);
  expect(screen.getByRole("region", { name: "Numeria" })).toBeTruthy();
  expect(screen.getByRole("button", { name: "Visit Fraction Forest" }).getAttribute("aria-pressed")).toBe("true");
  expect(state.props).toMatchObject({ theme: "math", mode: "globe", quality: "fallback", reducedMotion: true, selectedLandmark: "fraction-forest" });
});

it.each(regions)("selects $name through the scene and opens its activity", (region) => {
  render(<MathPlanetCanvas onBackToWorlds={vi.fn()} />);
  act(() => state.props.onLandmarkSelect?.(region.id));
  expect(screen.getByRole("button", { name: `Visit ${region.name}` }).getAttribute("aria-pressed")).toBe("true");
  expect(state.props.destination).toEqual(region.destination);
  expect(state.props.mode).toBe("follow");
  fireEvent.click(screen.getByRole("button", { name: `Explore ${region.name}` }));
  const dialog = screen.getByRole("dialog", { name: `${region.name} activity session` });
  expect(within(dialog).getByRole("heading", { name: MATH_ACTIVITIES[region.id as MathRegionId].challenges[0].prompt })).toBeTruthy();
});

it("restarts walking when the active region is selected again after manual movement", () => {
  render(<MathPlanetCanvas onBackToWorlds={vi.fn()} />);
  const region = LANDMARKS.find((landmark) => landmark.id === "geometry-ridge")!;
  act(() => state.props.onLandmarkSelect?.(region.id));
  state.props.explorerInput!.current.destination = null;
  act(() => state.props.onLandmarkSelect?.(region.id));
  expect(state.props.explorerInput?.current.destination).toEqual(region.destination);
  expect(state.props.destination).toEqual(region.destination);
  expect(state.props.destination).not.toBe(region.destination);
});

it("selects from the HUD and ignores Lexi", () => {
  render(<MathPlanetCanvas onBackToWorlds={vi.fn()} />);
  fireEvent.click(screen.getByRole("button", { name: "Visit Crystal Crater" }));
  const destination = state.props.destination;
  const lexi = LANDMARKS.find((landmark) => landmark.id === "lexi")!;
  act(() => {
    // UniverseCanvas sends the destination before notifying landmark selection.
    state.props.explorerInput!.current.destination = lexi.destination;
    state.props.onDestinationChange?.(lexi.destination);
    state.props.onLandmarkSelect?.("lexi");
  });
  expect(state.props.selectedLandmark).toBe("crystal-crater");
  expect(state.props.destination).toEqual(destination);
  expect(state.props.explorerInput?.current.destination).toEqual(destination);
  expect(screen.queryByRole("button", { name: /Visit Lexi/ })).toBeNull();
});

it("keeps the universe mounted and inert, pauses input, and restores focus on Escape", async () => {
  const onSessionOpenChange = vi.fn();
  render(<MathPlanetCanvas onBackToWorlds={vi.fn()} onSessionOpenChange={onSessionOpenChange} />);
  const scene = screen.getByRole("region", { name: "Mock Numeria scene" });
  const explore = screen.getByRole("button", { name: "Explore Fraction Forest" });
  explore.focus();
  fireEvent.click(explore);
  expect(onSessionOpenChange).toHaveBeenLastCalledWith(true);
  expect(state.props.controlsDisabled).toBe(true);
  expect(state.props.explorerInput?.current.paused).toBe(true);
  expect(scene.closest("[inert]")).toBeTruthy();
  expect(scene.closest('[aria-hidden="true"]')).toBeTruthy();
  fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(screen.getByRole("region", { name: "Mock Numeria scene" })).toBe(scene);
  expect(state.props.controlsDisabled).toBe(false);
  expect(state.props.explorerInput?.current.paused).toBe(false);
  expect(onSessionOpenChange.mock.calls).toEqual([[true], [false]]);
  await waitFor(() => expect(document.activeElement).toBe(explore));
});

it("offers an explicit close button before completing an activity", () => {
  const onSessionOpenChange = vi.fn();
  render(<MathPlanetCanvas onBackToWorlds={vi.fn()} onSessionOpenChange={onSessionOpenChange} />);
  fireEvent.click(screen.getByRole("button", { name: "Explore Fraction Forest" }));
  fireEvent.click(screen.getByRole("button", { name: "Close activity" }));
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(onSessionOpenChange.mock.calls).toEqual([[true], [false]]);
  expect(screen.getByText("0 of 4 regions complete")).toBeTruthy();
});

it("marks only the completed region and announces it after returning", () => {
  const onSessionOpenChange = vi.fn();
  render(<MathPlanetCanvas onBackToWorlds={vi.fn()} onSessionOpenChange={onSessionOpenChange} />);
  fireEvent.click(screen.getByRole("button", { name: "Visit Number Valley" }));
  fireEvent.click(screen.getByRole("button", { name: "Explore Number Valley" }));
  for (const challenge of MATH_ACTIVITIES["number-valley"].challenges) {
    fireEvent.click(screen.getByRole("radio", { name: challenge.answer }));
    fireEvent.click(screen.getByRole("button", { name: "Check answer" }));
  }
  fireEvent.click(screen.getByRole("button", { name: "Back to Numeria" }));
  expect(onSessionOpenChange.mock.calls).toEqual([[true], [false]]);
  const announcement = screen.getByText("Wonderful exploring! Number Valley complete.");
  expect(announcement.getAttribute("aria-live")).toBe("polite");
  expect(screen.getByText("1 of 4 regions complete")).toBeTruthy();
  const completed = screen.getByRole("button", { name: "Visit Number Valley" });
  expect(document.getElementById(completed.getAttribute("aria-describedby") ?? "")?.textContent).toBe("Complete");
  expect(within(completed).getAllByText("Complete").filter((node) => node.getAttribute("aria-hidden") === "true")).toHaveLength(1);
  for (const region of regions.filter((entry) => entry.id !== "number-valley")) {
    const other = screen.getByRole("button", { name: `Visit ${region.name}` });
    expect(other.getAttribute("aria-describedby")).toBeNull();
    expect(within(other).queryByText("Complete")).toBeNull();
  }
});

it("toggles, resets, and accepts scene camera and destination changes", () => {
  const back = vi.fn();
  render(<MathPlanetCanvas onBackToWorlds={back} />);
  fireEvent.click(screen.getByRole("button", { name: "Follow explorer" }));
  expect(state.props.mode).toBe("follow");
  fireEvent.click(screen.getByRole("button", { name: "View whole planet" }));
  expect(state.props.mode).toBe("globe");
  act(() => { state.props.onModeChange?.("follow"); state.props.onDestinationChange?.({ latitude: .1, longitude: .2 }); });
  expect(state.props.destination).toEqual({ latitude: .1, longitude: .2 });
  const resetKey = state.props.resetViewKey;
  fireEvent.click(screen.getByRole("button", { name: "Reset view" }));
  expect(state.props.mode).toBe("globe");
  expect(state.props.resetViewKey).not.toBe(resetKey);
  fireEvent.click(screen.getByRole("button", { name: "Back to Worlds" }));
  expect(back).toHaveBeenCalledOnce();
});

it("announces a missing mapping without opening an empty dialog", () => {
  const onSessionOpenChange = vi.fn();
  const back = vi.fn();
  render(<MathPlanetCanvas onBackToWorlds={back} onSessionOpenChange={onSessionOpenChange} />);
  const savedActivity = MATH_ACTIVITIES["fraction-forest"];
  const mutableActivities: Partial<Record<MathRegionId, MathActivity>> = MATH_ACTIVITIES;
  try {
    delete mutableActivities["fraction-forest"];
    fireEvent.click(screen.getByRole("button", { name: "Explore Fraction Forest" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByText(/activities are unavailable/i).getAttribute("aria-live")).toBe("polite");
    expect(onSessionOpenChange).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Back to Worlds" }));
    expect(back).toHaveBeenCalledOnce();
  } finally {
    mutableActivities["fraction-forest"] = savedActivity;
  }
});
