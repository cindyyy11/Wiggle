// @vitest-environment jsdom
import React, { useState } from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { AnswerBenchSceneProps } from "../handActivity/AnswerBenchScene";
import { ANSWER_SETS, type MathHandRegion } from "../handActivity/answerSets";
import { MATH_ACTIVITIES, type MathChallenge } from "./mathActivities";
import { CELEBRATE_MS, MathHandSession } from "./MathHandSession";

const mock = vi.hoisted(() => ({ scene: null as AnswerBenchSceneProps | null, play: vi.fn(), unlocks: [] as ReturnType<typeof vi.fn>[], speak: vi.fn() }));
vi.mock("../../features/gestures/useHandTracking", () => ({
  useHandTracking: () => ({ status: "ready", video: { current: null }, retry: vi.fn(), latest: { current: { isTracking: false } } }),
}));
vi.mock("../handActivity/AnswerBenchScene", () => ({
  AnswerBenchScene: (props: AnswerBenchSceneProps) => { mock.scene = props; return <div data-testid="scene" />; },
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

const regions = (Object.keys(ANSWER_SETS) as MathHandRegion[]).filter((region) => ANSWER_SETS[region]);
const select = (option: string) => act(() => mock.scene!.onSelect(option));
const celebrate = () => act(() => { vi.advanceTimersByTime(CELEBRATE_MS + 50); });
const status = () => screen.getByRole("status").textContent ?? "";
const progress = () => screen.getByRole("img", { name: /puzzles solved/ }).getAttribute("aria-label");
const wrongFor = (challenge: MathChallenge) => challenge.options.find((option) => option !== challenge.answer)!;

function open(region: MathHandRegion = "number-valley", handlers: { onComplete?: () => void; onClose?: () => void } = {}) {
  const onComplete = handlers.onComplete ?? vi.fn();
  const onClose = handlers.onClose ?? vi.fn();
  render(<MathHandSession region={region} onComplete={onComplete} onClose={onClose} />);
  return { onComplete, onClose };
}

it.each(regions)("%s: plays every puzzle with hand selections only, and completes once", (region) => {
  const activity = MATH_ACTIVITIES[region];
  const total = activity.challenges.length;
  const { onComplete } = open(region);
  expect(screen.queryByRole("radio")).toBeNull();
  expect(screen.queryByRole("button", { name: "Check answer" })).toBeNull();

  activity.challenges.forEach((challenge, index) => {
    expect(screen.getByText(`Puzzle ${index + 1} of ${total} · Hold over an answer`)).toBeTruthy();
    expect(status()).toBe(challenge.prompt);
    expect(mock.scene?.challenge.id).toBe(challenge.id);

    select(wrongFor(challenge));
    expect(status()).toBe(`Try again. ${challenge.hint}`);
    expect(mock.play).toHaveBeenLastCalledWith("tryAgain");
    expect(progress()).toBe(`${index} of ${total} puzzles solved`);

    select(challenge.answer);
    expect(status()).toBe("That's right! Great thinking.");
    expect(mock.play).toHaveBeenLastCalledWith("correct");
    expect(progress()).toBe(`${index + 1} of ${total} puzzles solved`);
    celebrate();
    expect(onComplete).toHaveBeenCalledTimes(index === total - 1 ? 1 : 0);
  });

  expect(status()).toBe("Wonderful exploring! You solved every puzzle.");
  expect(mock.play).toHaveBeenLastCalledWith("celebrate");
  expect(screen.getByText("All done!", { selector: "p" })).toBeTruthy();
  expect(onComplete).toHaveBeenCalledWith(region);
});

it("waits out the celebration before showing the next puzzle", () => {
  open();
  const [first, second] = MATH_ACTIVITIES["number-valley"].challenges;
  select(first.answer);
  act(() => { vi.advanceTimersByTime(CELEBRATE_MS - 100); });
  expect(screen.getByText("Puzzle 1 of 3 · Hold over an answer")).toBeTruthy();
  expect(mock.scene?.state.phase).toBe("celebrating");
  act(() => { vi.advanceTimersByTime(200); });
  expect(screen.getByText("Puzzle 2 of 3 · Hold over an answer")).toBeTruthy();
  expect(mock.scene?.challenge.id).toBe(second.id);
  expect(mock.scene?.state.phase).toBe("asking");
});

it("ignores selections while a right answer is being celebrated", () => {
  open();
  const first = MATH_ACTIVITIES["number-valley"].challenges[0];
  select(first.answer);
  select(wrongFor(first));
  select(first.answer);
  expect(mock.play).not.toHaveBeenCalledWith("tryAgain");
  expect(progress()).toBe("1 of 3 puzzles solved");
});

it("counts a right answer once when two arrive in one tick", () => {
  open();
  const first = MATH_ACTIVITIES["number-valley"].challenges[0];
  act(() => { mock.scene!.onSelect(first.answer); mock.scene!.onSelect(first.answer); });
  expect(progress()).toBe("1 of 3 puzzles solved");
  expect(mock.play.mock.calls.filter(([name]) => name === "correct")).toHaveLength(1);
});

it("does not complete the region until the last puzzle has been celebrated", () => {
  const { onComplete } = open();
  const challenges = MATH_ACTIVITIES["number-valley"].challenges;
  for (const challenge of challenges.slice(0, -1)) { select(challenge.answer); celebrate(); }
  select(challenges[challenges.length - 1].answer);
  expect(onComplete).not.toHaveBeenCalled();
  celebrate();
  expect(onComplete).toHaveBeenCalledTimes(1);
  celebrate();
  expect(onComplete).toHaveBeenCalledTimes(1);
});

it("gives the scene this region's set", () => {
  open();
  expect(mock.scene?.set).toBe(ANSWER_SETS["number-valley"]);
});

it("leaves through the exit button", () => {
  const { onClose } = open();
  fireEvent.click(screen.getByRole("button", { name: "Back to Numeria" }));
  expect(onClose).toHaveBeenCalledTimes(1);
});

it("unlocks its own sound instance on mount, not only the shell's", () => {
  open();
  expect(mock.unlocks.length).toBeGreaterThanOrEqual(2);
  for (const unlock of mock.unlocks) expect(unlock).toHaveBeenCalled();
});

it("starts again from the first puzzle when it is opened again", () => {
  open();
  select(MATH_ACTIVITIES["number-valley"].challenges[0].answer);
  celebrate();
  expect(screen.getByText("Puzzle 2 of 3 · Hold over an answer")).toBeTruthy();
  cleanup();
  open();
  expect(screen.getByText("Puzzle 1 of 3 · Hold over an answer")).toBeTruthy();
  expect(progress()).toBe("0 of 3 puzzles solved");
});
