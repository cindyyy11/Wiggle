import type { Gesture } from "../../features/gestures/gestureClassifier";
import type { AnswerPhase } from "./answerPlay";
import type { BenchPhase } from "./handBenchPlay";

export type GestureHint = "point" | "pinch" | "open_palm" | "hold" | "none";

export type CoachMode =
  | { kind: "bench"; phase: BenchPhase; holding: boolean }
  | { kind: "answer"; phase: AnswerPhase }
  | { kind: "magnet"; checkpoint: "explore" | "sort" | "hidden"; holding: boolean };

export type NudgeState = { phaseKey: string; delivered: boolean };

export function phaseKey(mode: CoachMode): string {
  if (mode.kind === "magnet") return `magnet:${mode.checkpoint}:${mode.holding ? "hold" : "idle"}`;
  return mode.kind === "bench" ? `bench:${mode.phase}:${mode.holding ? "hold" : "idle"}` : `answer:${mode.phase}`;
}

export function expectedHint(mode: CoachMode): GestureHint {
  if (mode.kind === "answer") {
    if (mode.phase === "asking") return "hold";
    return "none";
  }
  if (mode.kind === "magnet") {
    if (mode.checkpoint === "explore") return "open_palm";
    if (mode.checkpoint === "sort") return mode.holding ? "open_palm" : "pinch";
    return "point";
  }
  if (mode.phase === "discover") return "point";
  if (mode.phase === "match") return mode.holding ? "open_palm" : "pinch";
  return "none";
}

export function wrongGestureLine(mode: CoachMode, gesture: Gesture | null): string | null {
  if (!gesture) return null;
  if (mode.kind === "answer") return null;
  if (mode.kind === "magnet") {
    if (mode.checkpoint === "explore") {
      return gesture === "open_palm" ? null : "Open your palm to move the magnet!";
    }
    if (mode.checkpoint === "sort") {
      if (mode.holding) return gesture === "open_palm" ? null : "Open your palm over PULLS or NO PULL!";
      return gesture === "pinch" ? null : "Pinch to pick up an object!";
    }
    return gesture === "point" ? null : "Point to find the hidden magnet!";
  }
  if (mode.phase === "discover") {
    return gesture === "point" ? null : "Try pointing your finger to discover!";
  }
  if (mode.phase === "match") {
    if (mode.holding) return gesture === "open_palm" ? null : "Open your palm over its home to place it!";
    return gesture === "pinch" ? null : "Pinch your fingers to pick it up!";
  }
  return null;
}

export function initialNudgeState(mode: CoachMode): NudgeState {
  return { phaseKey: phaseKey(mode), delivered: false };
}

/**
 * One tip per wrong streak. Re-arms when the phase key changes, when the gesture
 * becomes correct, or when tracking drops (null gesture) after a tip was shown.
 */
export function nextNudge(state: NudgeState, mode: CoachMode, gesture: Gesture | null): { state: NudgeState; nudge: string | null } {
  const key = phaseKey(mode);
  const current = state.phaseKey === key ? state : { phaseKey: key, delivered: false };
  const line = wrongGestureLine(mode, gesture);
  if (!gesture) return { state: { phaseKey: key, delivered: false }, nudge: null };
  if (!line) return { state: { phaseKey: key, delivered: false }, nudge: null };
  if (current.delivered) return { state: current, nudge: null };
  return { state: { phaseKey: key, delivered: true }, nudge: line };
}
