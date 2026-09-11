import type { ActivityContent, LearningMode, SimulationReport, StartSessionResponse, StrategyName } from "@wiggle/contracts";

export const DEMO_CHILD_ID = "10000000-0000-0000-0000-000000000011";
export const DEMO_MISSION_ID = "10000000-0000-0000-0000-000000000111";
export const OBJECTIVE = "identify-three-quarters";
export const WIGGLE_REWARD = 20;
// The authored demonstration's measured outcome, separate from simulator predictions.
export const DEMO_CORRECTNESS = .92;
export const activity: ActivityContent = { objective: OBJECTIVE, targetSlices: 3, totalSlices: 4, text: "Select three of four equal pizza slices." };
export const demoSimulation: SimulationReport = {
  objective: OBJECTIVE, recommendedStrategy: "visual_gesture",
  ranked: [
    { strategy: "visual_gesture", predictedSuccess: .87, predictedFriction: .18, expectedMasteryGain: .21, factors: [] },
    { strategy: "visual", predictedSuccess: .68, predictedFriction: .32, expectedMasteryGain: .16, factors: [] },
    { strategy: "standard", predictedSuccess: .46, predictedFriction: .51, expectedMasteryGain: .1, factors: [] },
  ],
};
export function demoSession(sessionId: string): StartSessionResponse {
  return { sessionId, childId: DEMO_CHILD_ID, missionId: DEMO_MISSION_ID, objective: OBJECTIVE, activity };
}
export const modeForStrategy = (strategy: StrategyName): LearningMode => strategy === "chunked" ? "chunk" : strategy === "challenge" ? "standard" : strategy;
export const modeLabels: Partial<Record<LearningMode, string>> = { standard: "Standard", visual: "Visual", gesture: "Gesture", visual_gesture: "Gesture + Visual", chunk: "Tiny steps" };
