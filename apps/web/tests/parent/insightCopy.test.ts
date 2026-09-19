import { expect, it } from "vitest";
import type { LearnerTwin } from "@wiggle/contracts";
import { feelingSignals, feelingTip, masteryLevel, objectiveLabel, plural, todayHeadline, trendSummary } from "../../components/parent/insightCopy";

const twin = (overrides: Partial<LearnerTwin> = {}): LearnerTwin => ({
  mastery: {}, initiationFriction: 0.1, persistenceFriction: 0.1, cognitiveLoad: 0.1, transitionFriction: 0.1, fatigueEstimate: 0.1,
  modalityEffectiveness: { visual: 0.5, voice: 0.5, gesture: 0.5, movement: 0.5, story: 0.5, text: 0.5 },
  strategyEffectiveness: { chunking: 0.5, movementBreak: 0.5, visualHint: 0.5, voiceHint: 0.5, choice: 0.5 },
  ...overrides,
});

it("turns objective ids into readable names", () => {
  expect(objectiveLabel("identify-three-quarters")).toBe("Finding three quarters");
  expect(objectiveLabel("compare-fractions")).toBe("Comparing fractions");
  expect(objectiveLabel("place_value-tens")).toBe("Place value tens");
});

it("pluralises counts", () => {
  expect(plural(1, "mission")).toBe("1 mission");
  expect(plural(0, "help request")).toBe("0 help requests");
  expect(plural(2, "reset break")).toBe("2 reset breaks");
});

it("bands mastery into four gentle levels", () => {
  expect(masteryLevel(0.1).label).toBe("Just starting");
  expect(masteryLevel(0.5).label).toBe("Growing");
  expect(masteryLevel(0.7).label).toBe("Strong");
  expect(masteryLevel(0.9).label).toBe("Mastered");
});

it("describes how the child is feeling in words, never numbers", () => {
  const relaxed = feelingSignals(twin());
  expect(relaxed.map(signal => signal.word)).toEqual(["Fresh", "Calm", "Easy", "Steady", "Smooth"]);
  expect(relaxed.every(signal => signal.level === "good")).toBe(true);
  expect(feelingTip(relaxed)).toBeNull();

  const tired = feelingSignals(twin({ fatigueEstimate: 0.9, transitionFriction: 0.5 }));
  expect(tired.find(signal => signal.key === "energy")).toMatchObject({ word: "Tired", level: "support" });
  expect(tired.find(signal => signal.key === "switching")).toMatchObject({ word: "Needs a heads-up", level: "watch" });
  expect(feelingTip(tired)).toMatch(/movement break/);
  expect(JSON.stringify(tired)).not.toMatch(/\d\.\d|%/);
});

it("leads with what happened today", () => {
  const today = { missionsCompleted: 2, independentMissions: 1, helpRequests: 1, resetBreaks: 0, learningMinutes: 12, offlineMinutes: 0 };
  expect(todayHeadline("Maya", today, 5)).toBe("Maya finished 2 missions today");
  expect(todayHeadline("Maya", { ...today, missionsCompleted: 1 }, 5)).toBe("Maya finished 1 mission today");
  expect(todayHeadline("Maya", { ...today, missionsCompleted: 0 }, 5)).toBe("No missions yet today. Maya has finished 5 so far");
  expect(todayHeadline("Maya", undefined, 0)).toBe("Maya is ready for a first mission");
});

it("summarises a trend as the change since the first point", () => {
  expect(trendSummary([])).toBeNull();
  expect(trendSummary([{ label: "Mission 1", value: 0.2 }])).toMatchObject({ latest: 20, change: null, text: "Latest 20%" });
  expect(trendSummary([{ label: "Mission 1", value: 0.2 }, { label: "Mission 2", value: 0.62 }])).toMatchObject({ latest: 62, change: 42, text: "Up 42 points since Mission 1" });
  expect(trendSummary([{ label: "Mon", value: 0.7 }, { label: "Tue", value: 0.5 }])?.text).toBe("Down 20 points since Mon");
  expect(trendSummary([{ label: "Mon", value: 0.5 }, { label: "Tue", value: 0.5 }])?.text).toBe("Steady since Mon");
});
