/** The serializable Learner Digital Twin state shared by Wiggle clients and services. */
export type Probability = number;

export interface ModalityEffectiveness {
  visual: Probability;
  voice: Probability;
  gesture: Probability;
  movement: Probability;
  story: Probability;
  text: Probability;
}

export interface StrategyEffectiveness {
  chunking: Probability;
  movementBreak: Probability;
  visualHint: Probability;
  voiceHint: Probability;
  choice: Probability;
}

export interface LearnerTwin {
  mastery: Readonly<Record<string, Probability>>;
  initiationFriction: Probability;
  persistenceFriction: Probability;
  cognitiveLoad: Probability;
  transitionFriction: Probability;
  fatigueEstimate: Probability;
  modalityEffectiveness: ModalityEffectiveness;
  strategyEffectiveness: StrategyEffectiveness;
}

const modalityKeys = ["visual", "voice", "gesture", "movement", "story", "text"] as const;
const strategyKeys = ["chunking", "movementBreak", "visualHint", "voiceHint", "choice"] as const;

export function assertProbability(value: unknown, field: string): asserts value is Probability {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 1) {
    throw new TypeError(`${field} must be a finite number from 0 to 1`);
  }
}

/** Validate the range-constrained portion of the wire contract without mutation. */
export function assertLearnerTwin(twin: LearnerTwin): LearnerTwin {
  for (const [objective, value] of Object.entries(twin.mastery)) {
    assertProbability(value, `mastery.${objective}`);
  }
  assertProbability(twin.initiationFriction, "initiationFriction");
  assertProbability(twin.persistenceFriction, "persistenceFriction");
  assertProbability(twin.cognitiveLoad, "cognitiveLoad");
  assertProbability(twin.transitionFriction, "transitionFriction");
  assertProbability(twin.fatigueEstimate, "fatigueEstimate");
  for (const key of modalityKeys) {
    assertProbability(twin.modalityEffectiveness[key], `modalityEffectiveness.${key}`);
  }
  for (const key of strategyKeys) {
    assertProbability(twin.strategyEffectiveness[key], `strategyEffectiveness.${key}`);
  }
  return twin;
}

export interface AuditChange {
  field: string;
  previousValue: Probability;
  evidence: string;
  delta: number;
  resultingValue: Probability;
}

export interface TwinUpdate {
  twin: LearnerTwin;
  changes: readonly AuditChange[];
}
