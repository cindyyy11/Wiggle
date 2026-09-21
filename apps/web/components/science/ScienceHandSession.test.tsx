// @vitest-environment jsdom
import React, { useState } from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { BenchAction } from "../handActivity/handBenchPlay";
import type { HandBenchSceneProps } from "../handActivity/HandBenchScene";
import { BENCH_SETS } from "../handActivity/sets";
import { ScienceHandSession } from "./ScienceHandSession";
import { SCIENCE_ACTIVITIES, type StarterLand, type StarterProgress } from "./scienceActivities";

const mock = vi.hoisted(() => ({ scene: null as HandBenchSceneProps | null, play: vi.fn(), unlocks: [] as ReturnType<typeof vi.fn>[], speak: vi.fn() }));
vi.mock("../../features/gestures/useHandTracking", () => ({
  useHandTracking: () => ({ status: "ready", video: { current: null }, retry: vi.fn(), latest: { current: { isTracking: false } } }),
}));
vi.mock("../handActivity/HandBenchScene", () => ({
  HandBenchScene: (props: HandBenchSceneProps) => { mock.scene = props; return <div data-testid="scene" />; },
}));
vi.mock("../../features/voice/voicePreference", () => ({ speakIfUnmuted: (text: string) => mock.speak(text) }));
// Every component that calls the hook gets its own instance with its own unlock, like the real hook.
vi.mock("../../features/audio/useWiggleSound", () => ({
  useWiggleSound: () => {
    const [unlock] = useState(() => { const fn = vi.fn(); mock.unlocks.push(fn); return fn; });
    return { play: mock.play, unlock, muted: false, setMuted: vi.fn() };
  },
}));

beforeEach(() => { mock.scene = null; mock.unlocks.length = 0; vi.clearAllMocks(); vi.useFakeTimers(); });
afterEach(() => { cleanup(); vi.useRealTimers(); });

const lands = (Object.keys(BENCH_SETS) as StarterLand[]).filter((land) => BENCH_SETS[land]);
const send = (action: BenchAction) => act(() => mock.scene!.onAction(action));
const status = () => screen.getByRole("status").textContent ?? "";

function Harness({ land, initial, onClose = vi.fn() }: { land: StarterLand; initial?: StarterProgress; onClose?: () => void }) {
  const [progress, setProgress] = useState<StarterProgress>(initial ?? { observed: [], matched: [] });
  return <>
    <span data-testid="progress">{progress.observed.length}/{progress.matched.length}</span>
    <ScienceHandSession land={land} progress={progress} onProgress={setProgress} onClose={onClose} />
  </>;
}

it.each(lands)("%s: plays discover, then match, then done with hand actions only", (land) => {
  const activity = SCIENCE_ACTIVITIES[land];
  render(<Harness land={land} />);
  expect(screen.getByText("Step 1 of 2 · Discover")).toBeTruthy();
  expect(screen.queryByRole("button", { name: /^(Discover|Grab|Next:)/ })).toBeNull();

  for (const item of activity.items) send({ type: "observe", id: item.id });
  expect(status()).toBe(activity.items[activity.items.length - 1].fact);
  expect(screen.getByTestId("progress").textContent).toBe(`${activity.items.length}/0`);
  act(() => { vi.advanceTimersByTime(2300); });
  expect(screen.getByText("Step 2 of 2 · Match")).toBeTruthy();

  const first = activity.items[0];
  const wrong = activity.targets.find((target) => target.id !== first.target)!;
  send({ type: "grab", id: first.id });
  send({ type: "drop", id: first.id, target: wrong.id });
  expect(status()).toContain("Try again");
  expect(mock.play).toHaveBeenCalledWith("tryAgain");
  expect(screen.getByTestId("progress").textContent).toBe(`${activity.items.length}/0`);

  for (const item of activity.items) {
    send({ type: "grab", id: item.id });
    send({ type: "drop", id: item.id, target: item.target });
  }
  expect(status()).toBe("You did it! Every discovery is in its place.");
  expect(mock.play).toHaveBeenCalledWith("celebrate");
  expect(screen.getByTestId("progress").textContent).toBe(`${activity.items.length}/${activity.items.length}`);
  expect(screen.getByText("All done!", { selector: "p" })).toBeTruthy();
});

it("gives the scene the lesson's own targets", () => {
  render(<Harness land="animals" />);
  expect(mock.scene?.targetFor("frog")).toBe("both");
  expect(mock.scene?.targetFor("nothing")).toBeUndefined();
});

it("resumes in the matching step when every discovery was already made", () => {
  const activity = SCIENCE_ACTIVITIES.animals;
  render(<Harness land="animals" initial={{ observed: activity.items.map((item) => item.id), matched: [] }} />);
  expect(screen.getByText("Step 2 of 2 · Match")).toBeTruthy();
});

it("resumes mid-match with partial progress", () => {
  const items = SCIENCE_ACTIVITIES.animals.items;
  const third = items[2];
  render(<Harness land="animals" initial={{ observed: items.map((item) => item.id), matched: items.slice(0, 2).map((item) => item.id) }} />);
  expect(screen.getByText("Step 2 of 2 · Match")).toBeTruthy();
  expect(screen.getByTestId("progress").textContent).toBe(`${items.length}/2`);
  send({ type: "grab", id: third.id });
  send({ type: "drop", id: third.id, target: third.target });
  expect(screen.getByTestId("progress").textContent).toBe(`${items.length}/3`);
});

it("resumes as finished when every match was already made", () => {
  const ids = SCIENCE_ACTIVITIES.animals.items.map((item) => item.id);
  render(<Harness land="animals" initial={{ observed: ids, matched: ids }} />);
  expect(screen.getByText("All done!", { selector: "p" })).toBeTruthy();
});

it("leaves through the exit button", () => {
  const onClose = vi.fn();
  render(<Harness land="animals" onClose={onClose} />);
  fireEvent.click(screen.getByRole("button", { name: "Back to Science Planet" }));
  expect(onClose).toHaveBeenCalledTimes(1);
});

it("unlocks its own sound instance on mount, not only the shell's", () => {
  render(<Harness land="animals" />);
  expect(mock.unlocks.length).toBeGreaterThanOrEqual(2);
  for (const unlock of mock.unlocks) expect(unlock).toHaveBeenCalled();
});

const matchPhase = { observed: SCIENCE_ACTIVITIES.animals.items.map((item) => item.id), matched: [] as string[] };

it("judges two actions in one tick against fresh state", () => {
  const first = SCIENCE_ACTIVITIES.animals.items[0];
  render(<Harness land="animals" initial={matchPhase} />);
  act(() => {
    mock.scene!.onAction({ type: "grab", id: first.id });
    mock.scene!.onAction({ type: "drop", id: first.id, target: first.target });
  });
  expect(screen.getByTestId("progress").textContent).toBe(`${matchPhase.observed.length}/1`);
  expect(mock.play).toHaveBeenCalledWith("correct");
});

it("cancels a held item gently without judging it", () => {
  const first = SCIENCE_ACTIVITIES.animals.items[0];
  render(<Harness land="animals" initial={matchPhase} />);
  send({ type: "grab", id: first.id });
  send({ type: "cancel", id: first.id });
  expect(status()).toContain("No problem!");
  expect(mock.play).not.toHaveBeenCalledWith("tryAgain");
  expect(mock.play).not.toHaveBeenCalledWith("correct");
  expect(mock.play).not.toHaveBeenCalledWith("celebrate");
  expect(screen.getByTestId("progress").textContent).toBe(`${matchPhase.observed.length}/0`);
});
