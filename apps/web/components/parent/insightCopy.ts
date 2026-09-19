/**
 * Plain-English wording for the parent dashboard. Pure functions over the numbers the API
 * already returns, so the screen can lead with meaning ("Growing", "Steady") and keep the
 * raw percentages as supporting detail. Nothing here is a score or a diagnosis.
 */
import type { LearnerTwin, TodaySummary } from "@wiggle/contracts";

export type Tone = "sage" | "blue" | "mustard" | "coral";

const KNOWN_OBJECTIVES: Record<string, string> = {
  "identify-three-quarters": "Finding three quarters",
  "equal-parts": "Equal parts",
  "compare-fractions": "Comparing fractions",
};

/** "compare-fractions" -> "Comparing fractions"; unknown ids become readable sentence case. */
export function objectiveLabel(objective: string): string {
  const known = KNOWN_OBJECTIVES[objective];
  if (known) return known;
  const words = objective.replace(/[-_]+/g, " ").trim();
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : objective;
}

export const plural = (count: number, one: string, many = `${one}s`) => `${count} ${count === 1 ? one : many}`;

export interface MasteryLevel { label: string; tone: Tone }

/** Estimates from practice, not grades: four gentle bands. */
export function masteryLevel(value: number): MasteryLevel {
  if (value < 0.35) return { label: "Just starting", tone: "mustard" };
  if (value < 0.65) return { label: "Growing", tone: "blue" };
  if (value < 0.85) return { label: "Strong", tone: "sage" };
  return { label: "Mastered", tone: "sage" };
}

export type FeelingLevel = "good" | "watch" | "support";

export interface FeelingSignal {
  key: "energy" | "focus" | "starting" | "sticking" | "switching";
  label: string;
  word: string;
  level: FeelingLevel;
}

const band = (value: number): 0 | 1 | 2 => (value < 0.34 ? 0 : value < 0.67 ? 1 : 2);
const LEVELS: FeelingLevel[] = ["good", "watch", "support"];

/** How the child is doing right now, in words. Higher friction/fatigue means more support helps. */
export function feelingSignals(twin: LearnerTwin): FeelingSignal[] {
  const pick = (key: FeelingSignal["key"], label: string, value: number, words: [string, string, string]): FeelingSignal => {
    const index = band(value);
    return { key, label, word: words[index], level: LEVELS[index] };
  };
  return [
    pick("energy", "Energy", twin.fatigueEstimate, ["Fresh", "Steady", "Tired"]),
    pick("focus", "Focus", twin.cognitiveLoad, ["Calm", "Working hard", "A lot to handle"]),
    pick("starting", "Getting started", twin.initiationFriction, ["Easy", "Sometimes tricky", "Often tricky"]),
    pick("sticking", "Staying with it", twin.persistenceFriction, ["Steady", "Some wobbles", "Needs support"]),
    pick("switching", "Switching activities", twin.transitionFriction, ["Smooth", "Needs a heads-up", "Tricky"]),
  ];
}

const TIPS: Record<FeelingSignal["key"], string> = {
  energy: "Energy looks low, so a short movement break could help.",
  focus: "Things may feel like a lot right now. Try one small step at a time.",
  starting: "Getting started is tricky. Let them choose the first activity.",
  sticking: "Staying with it is hard right now. Celebrate small finishes.",
  switching: "Switching is tricky. Give a two-minute heads-up before changing activity.",
};

/** One practical suggestion for the area that most needs support, or null when nothing does. */
export function feelingTip(signals: readonly FeelingSignal[]): string | null {
  const support = signals.find(signal => signal.level === "support");
  return support ? TIPS[support.key] : null;
}

/** The one-sentence answer to "how did today go?". */
export function todayHeadline(name: string, today: TodaySummary | undefined, completedMissions: number): string {
  const done = today?.missionsCompleted ?? 0;
  if (done > 0) return `${name} finished ${plural(done, "mission")} today`;
  if (completedMissions > 0) return `No missions yet today. ${name} has finished ${completedMissions} so far`;
  return `${name} is ready for a first mission`;
}

export interface TrendSummary { latest: number; change: number | null; firstLabel: string; text: string }

/** Latest value plus the change since the first point, worded for a parent. */
export function trendSummary(points: readonly { label: string; value: number }[]): TrendSummary | null {
  if (!points.length) return null;
  const first = points[0];
  const last = points[points.length - 1];
  const latest = Math.round(last.value * 100);
  if (points.length < 2) return { latest, change: null, firstLabel: first.label, text: `Latest ${latest}%` };
  const change = Math.round((last.value - first.value) * 100);
  const movement = change > 0 ? `Up ${change} points` : change < 0 ? `Down ${Math.abs(change)} points` : "Steady";
  return { latest, change, firstLabel: first.label, text: `${movement} since ${first.label}` };
}
