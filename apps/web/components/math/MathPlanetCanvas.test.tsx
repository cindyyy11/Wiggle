// @vitest-environment jsdom
import React from "react";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { AnswerBenchSceneProps } from "../handActivity/AnswerBenchScene";
import type { UniverseCanvasProps } from "../universe/UniverseCanvas";
import { LANDMARKS } from "../universe/world";
import { MATH_ACTIVITIES, type MathActivity, type MathRegionId } from "./mathActivities";
import { MathPlanet } from "./MathPlanet";
import { CELEBRATE_MS } from "./MathHandSession";
import { MathPlanetCanvas } from "./MathPlanetCanvas";
import { ApiClient } from "../../lib/api/client";
import { demoSession, DEMO_CHILD_ID } from "../../lib/demo/seed";

const state = vi.hoisted(() => ({ props: {} as UniverseCanvasProps }));
const answers = vi.hoisted(() => ({ props: null as AnswerBenchSceneProps | null }));
vi.mock("../../features/gestures/useHandTracking", () => ({
  useHandTracking: () => ({ status: "ready", video: { current: null }, retry: vi.fn(), latest: { current: { isTracking: false } } }),
}));
vi.mock("../handActivity/AnswerBenchScene", () => ({
  AnswerBenchScene: (props: AnswerBenchSceneProps) => { answers.props = props; return <div data-testid="answer-scene" />; },
}));
vi.mock("../../features/audio/useWiggleSound", () => ({ useWiggleSound: () => ({ play: vi.fn(), unlock: vi.fn(), muted: false, setMuted: vi.fn() }) }));
vi.mock("../../features/voice/voicePreference", () => ({ speakIfUnmuted: vi.fn(), isVoiceMuted: () => true, setVoiceMuted: vi.fn() }));
vi.mock("../universe/UniverseCanvas", () => ({
  UniverseCanvas: (props: UniverseCanvasProps) => {
    state.props = props;
    return <section aria-label="Mock Numeria scene">{props.hud}{props.children}</section>;
  },
}));

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
});

afterEach(cleanup);
const regions = LANDMARKS.filter((landmark) => landmark.id !== "lexi");
// Fraction Forest runs the API-backed fractions mission; these regions use local field activities.
const fieldRegions = regions.filter((landmark) => landmark.id !== "fraction-forest");
const forest = regions.find((landmark) => landmark.id === "fraction-forest")!;

function visit(name: string) {
  fireEvent.click(screen.getByRole("button", { name: `Visit ${name}` }));
}

it("labels the planet and starts at Fraction Forest with the math globe", () => {
  render(<MathPlanet onBackToWorlds={vi.fn()} quality="fallback" reducedMotion />);
  expect(screen.getByRole("region", { name: "Numeria" })).toBeTruthy();
  expect(screen.getByRole("button", { name: "Visit Fraction Forest" }).getAttribute("aria-pressed")).toBe("true");
  expect(state.props).toMatchObject({ theme: "math", mode: "globe", quality: "fallback", reducedMotion: true, selectedLandmark: "fraction-forest" });
});

it.each(fieldRegions)("selects $name through the scene and opens its hand-played activity", (region) => {
  render(<MathPlanetCanvas onBackToWorlds={vi.fn()} />);
  act(() => state.props.onLandmarkSelect?.(region.id));
  expect(screen.getByRole("button", { name: `Visit ${region.name}` }).getAttribute("aria-pressed")).toBe("true");
  expect(state.props.destination).toEqual(region.destination);
  expect(state.props.mode).toBe("follow");
  fireEvent.click(screen.getByRole("button", { name: `Explore ${region.name}` }));
  const dialog = screen.getByRole("dialog", { name: `${region.name} activity session` });
  expect(within(dialog).getByRole("heading", { name: region.name })).toBeTruthy();
  expect(answers.props?.challenge.id).toBe(MATH_ACTIVITIES[region.id as MathRegionId].challenges[0].id);
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
  visit("Number Valley");
  const explore = screen.getByRole("button", { name: "Explore Number Valley" });
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
  visit("Geometry Ridge");
  fireEvent.click(screen.getByRole("button", { name: "Explore Geometry Ridge" }));
  fireEvent.click(screen.getByRole("button", { name: "Back to Numeria" }));
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(onSessionOpenChange.mock.calls).toEqual([[true], [false]]);
  expect(screen.getByText("0 of 4 regions complete")).toBeTruthy();
});

it("marks only the completed region and announces it after returning", () => {
  vi.useFakeTimers();
  try {
    const onSessionOpenChange = vi.fn();
    render(<MathPlanetCanvas onBackToWorlds={vi.fn()} onSessionOpenChange={onSessionOpenChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Visit Geometry Ridge" }));
    fireEvent.click(screen.getByRole("button", { name: "Explore Geometry Ridge" }));
    for (const challenge of MATH_ACTIVITIES["geometry-ridge"].challenges) {
      act(() => answers.props!.onSelect(challenge.answer));
      act(() => { vi.advanceTimersByTime(CELEBRATE_MS + 50); });
    }
    fireEvent.click(screen.getByRole("button", { name: "Back to Numeria" }));
    expect(onSessionOpenChange.mock.calls).toEqual([[true], [false]]);
    const announcement = screen.getByText("Wonderful exploring! Geometry Ridge complete.");
    expect(announcement.getAttribute("aria-live")).toBe("polite");
    expect(screen.getByText("1 of 4 regions complete")).toBeTruthy();
    const completed = screen.getByRole("button", { name: "Visit Geometry Ridge" });
    expect(document.getElementById(completed.getAttribute("aria-describedby") ?? "")?.textContent).toBe("Complete");
    expect(within(completed).getAllByText("Complete").filter((node) => node.getAttribute("aria-hidden") === "true")).toHaveLength(1);
    for (const region of regions.filter((entry) => entry.id !== "geometry-ridge")) {
      const other = screen.getByRole("button", { name: `Visit ${region.name}` });
      expect(other.getAttribute("aria-describedby")).toBeNull();
      expect(within(other).queryByText("Complete")).toBeNull();
    }
  } finally {
    vi.useRealTimers();
  }
});

it("opens Number Valley as a camera-first hand session with no radio buttons", () => {
  render(<MathPlanetCanvas onBackToWorlds={vi.fn()} />);
  visit("Number Valley");
  fireEvent.click(screen.getByRole("button", { name: "Explore Number Valley" }));
  const dialog = screen.getByRole("dialog", { name: "Number Valley activity session" });
  expect(within(dialog).getByRole("heading", { name: "Number Valley" })).toBeTruthy();
  expect(within(dialog).getByText("Puzzle 1 of 3 · Hold over an answer")).toBeTruthy();
  expect(within(dialog).queryByRole("radio")).toBeNull();
  expect(within(dialog).queryByRole("button", { name: "Close activity" })).toBeNull();
  expect(within(dialog).getByRole("button", { name: "Back to Numeria" })).toBeTruthy();
  expect(answers.props?.challenge.id).toBe(MATH_ACTIVITIES["number-valley"].challenges[0].id);
});

it("marks Number Valley complete and announces it after the hand session finishes", () => {
  vi.useFakeTimers();
  try {
    const onSessionOpenChange = vi.fn();
    render(<MathPlanetCanvas onBackToWorlds={vi.fn()} onSessionOpenChange={onSessionOpenChange} />);
    visit("Number Valley");
    fireEvent.click(screen.getByRole("button", { name: "Explore Number Valley" }));
    for (const challenge of MATH_ACTIVITIES["number-valley"].challenges) {
      act(() => answers.props!.onSelect(challenge.answer));
      act(() => { vi.advanceTimersByTime(CELEBRATE_MS + 50); });
    }
    fireEvent.click(screen.getByRole("button", { name: "Back to Numeria" }));
    expect(onSessionOpenChange.mock.calls).toEqual([[true], [false]]);
    expect(screen.getByText("Wonderful exploring! Number Valley complete.").getAttribute("aria-live")).toBe("polite");
    expect(screen.getByText("1 of 4 regions complete")).toBeTruthy();
  } finally {
    vi.useRealTimers();
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
  visit("Number Valley");
  onSessionOpenChange.mockClear();
  const savedActivity = MATH_ACTIVITIES["number-valley"];
  const mutableActivities: Partial<Record<MathRegionId, MathActivity>> = MATH_ACTIVITIES;
  try {
    delete mutableActivities["number-valley"];
    fireEvent.click(screen.getByRole("button", { name: "Explore Number Valley" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByText(/activities are unavailable/i).getAttribute("aria-live")).toBe("polite");
    expect(onSessionOpenChange).not.toHaveBeenCalledWith(true);
    fireEvent.click(screen.getByRole("button", { name: "Back to Worlds" }));
    expect(back).toHaveBeenCalledOnce();
  } finally {
    mutableActivities["number-valley"] = savedActivity;
  }
});

function missionClient() {
  const client = new ApiClient();
  const start = vi.spyOn(client, "start").mockResolvedValue(demoSession("remote-session"));
  vi.spyOn(client, "events").mockImplementation(async (body) => ({ acceptedEventIds: body.events.map((event) => event.id) }));
  vi.spyOn(client, "twin").mockRejectedValue(new Error("no twin in this test"));
  return { client, start };
}

it("starts the API-backed fractions mission from Fraction Forest instead of a field quiz", async () => {
  const { client, start } = missionClient();
  const onSessionOpenChange = vi.fn();
  render(<MathPlanetCanvas client={client} childId="owned-child" allowLocalFallback={false} onBackToWorlds={vi.fn()} onSessionOpenChange={onSessionOpenChange} />);
  fireEvent.click(screen.getByRole("button", { name: "Explore Fraction Forest" }));
  await screen.findByRole("heading", { name: "Make three quarters" });
  expect(start.mock.calls[0][0]).toEqual({ childId: "owned-child" });
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(state.props.mode).toBe("mission");
  expect(state.props.destination).toEqual(forest.destination);
  expect(onSessionOpenChange).toHaveBeenLastCalledWith(true);
  // The Numeria HUD steps aside while the mission is open.
  expect(screen.queryByRole("button", { name: "Explore Fraction Forest" })).toBeNull();
});

it("marks Fraction Forest complete, announces it, and hands the world back after the mission", async () => {
  const { client } = missionClient();
  const onSessionOpenChange = vi.fn();
  render(<MathPlanetCanvas client={client} onBackToWorlds={vi.fn()} onSessionOpenChange={onSessionOpenChange} />);
  fireEvent.click(screen.getByRole("button", { name: "Explore Fraction Forest" }));
  await screen.findByRole("heading", { name: "Make three quarters" });
  fireEvent.click(screen.getByRole("button", { name: "3 of 4" }));
  fireEvent.click(screen.getByRole("button", { name: "Check my answer" }));
  fireEvent.click(await screen.findByRole("button", { name: "Back to my universe" }));
  await waitFor(() => expect(onSessionOpenChange).toHaveBeenLastCalledWith(false));
  expect(state.props.mode).toBe("follow");
  expect(state.props.destination).toBeNull();
  expect(screen.getByText("Wonderful exploring! Fraction Forest complete.")).toBeTruthy();
  expect(screen.getByText("1 of 4 regions complete")).toBeTruthy();
  const completed = screen.getByRole("button", { name: "Visit Fraction Forest" });
  expect(document.getElementById(completed.getAttribute("aria-describedby") ?? "")?.textContent).toBe("Complete");
});

it("cheers once after all four Numeria regions are complete this visit", async () => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  try {
    const { client } = missionClient();
    render(<MathPlanetCanvas client={client} onBackToWorlds={vi.fn()} />);
    for (const region of fieldRegions) {
      visit(region.name);
      fireEvent.click(screen.getByRole("button", { name: `Explore ${region.name}` }));
      for (const challenge of MATH_ACTIVITIES[region.id as MathRegionId].challenges) {
        act(() => answers.props!.onSelect(challenge.answer));
        act(() => { vi.advanceTimersByTime(CELEBRATE_MS + 50); });
      }
      fireEvent.click(screen.getByRole("button", { name: "Back to Numeria" }));
    }
    expect(screen.getByText("3 of 4 regions complete")).toBeTruthy();
    expect(screen.queryByRole("dialog", { name: "You did it!" })).toBeNull();

    visit(forest.name);
    fireEvent.click(screen.getByRole("button", { name: "Explore Fraction Forest" }));
    await screen.findByRole("heading", { name: "Make three quarters" });
    fireEvent.click(screen.getByRole("button", { name: "3 of 4" }));
    fireEvent.click(screen.getByRole("button", { name: "Check my answer" }));
    fireEvent.click(await screen.findByRole("button", { name: "Back to my universe" }));

    await waitFor(() => expect(screen.getByRole("dialog", { name: "You did it!" })).toBeTruthy());
    expect(screen.getByText("All four Numeria regions explored — you're a Numeria explorer!")).toBeTruthy();
    expect(screen.getByText("4 of 4 regions complete")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Keep exploring" }));
    expect(screen.queryByRole("dialog", { name: "You did it!" })).toBeNull();
  } finally {
    vi.useRealTimers();
  }
});

it("hydrates numeria completions and cheers once per session", () => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  window.localStorage.setItem(
    `wiggle:planet-complete:${DEMO_CHILD_ID}:numeria`,
    JSON.stringify(["fraction-forest", "number-valley", "geometry-ridge", "crystal-crater"]),
  );
  render(<MathPlanetCanvas onBackToWorlds={vi.fn()} childId={DEMO_CHILD_ID} />);
  expect(screen.getByText("4 of 4 regions complete")).toBeTruthy();
  expect(screen.getByRole("dialog", { name: "You did it!" })).toBeTruthy();
});

it("keeps the Numeria HUD and shows a retryable message when the mission cannot start", async () => {
  const client = new ApiClient();
  vi.spyOn(client, "start").mockRejectedValue(new Error("offline"));
  vi.spyOn(client, "events").mockResolvedValue({ acceptedEventIds: [] });
  render(<MathPlanetCanvas client={client} childId="owned-child" allowLocalFallback={false} onBackToWorlds={vi.fn()} />);
  fireEvent.click(screen.getByRole("button", { name: "Explore Fraction Forest" }));
  await screen.findByRole("alert");
  expect(screen.queryByRole("heading", { name: "Make three quarters" })).toBeNull();
  expect(state.props.mode).not.toBe("mission");
  expect(screen.getByRole("button", { name: "Explore Fraction Forest" })).toBeTruthy();
});
