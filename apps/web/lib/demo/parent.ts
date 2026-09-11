import type { ParentInsightsResponse } from "@wiggle/contracts";
import { DEMO_CHILD_ID } from "./seed";

export const demoParent: ParentInsightsResponse = {
  childId: DEMO_CHILD_ID, completedMissions: 0,
  twin: {
    mastery: { "identify-three-quarters": .4 }, initiationFriction: .5,
    persistenceFriction: .5, cognitiveLoad: .5, transitionFriction: .5, fatigueEstimate: .5,
    modalityEffectiveness: { visual: .75, gesture: .75, voice: .5, movement: .5, story: .5, text: .5 },
    strategyEffectiveness: { chunking: .5, movementBreak: .5, visualHint: .5, voiceHint: .5, choice: .5 },
  },
  insight: { text: "Try dividing a snack into four equal parts and finding three quarters together." },
  missions: [{ title: "Pizza Fractions", objective: "identify-three-quarters" }],
  masteryHistory: [], independenceHistory: [],
};
