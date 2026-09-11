import type { Probability } from "./twin.js";

export const strategyNames = [
  "standard",
  "chunked",
  "visual",
  "voice",
  "gesture",
  "visual_gesture",
  "movement",
  "story",
  "challenge",
] as const;

export type StrategyName = (typeof strategyNames)[number];

export type SimulationFactorName =
  | "modality_history"
  | "strategy_history"
  | "objective_compatibility"
  | "current_friction"
  | "fatigue"
  | "cognitive_load"
  | "novelty";

/** Authored, bounded inputs used by the deterministic strategy simulator. */
export interface ActivityCharacteristics {
  difficulty: Probability;
  objectiveCompatibility: Readonly<Partial<Record<StrategyName, Probability>>>;
  novelty: Readonly<Partial<Record<StrategyName, Probability>>>;
}

export interface SimulationFactor {
  name: SimulationFactorName;
  value: Probability;
  weight: number;
  contribution: number;
  explanation: string;
}

export interface StrategyPrediction {
  strategy: StrategyName;
  predictedSuccess: Probability;
  predictedFriction: Probability;
  expectedMasteryGain: Probability;
  factors: readonly SimulationFactor[];
}

export interface SimulationReport {
  objective: string;
  recommendedStrategy: StrategyName;
  ranked: readonly StrategyPrediction[];
}

