import type { AnswerSet } from "../answerSet";
import { NUMBER_VALLEY_SET } from "./NumberValleySet";

/** The three Numeria regions that are played with the hand. Fraction Forest has its own mission. */
export type MathHandRegion = "number-valley" | "geometry-ridge" | "crystal-crater";

/** Each hand-played region's 3D set, keyed by region id. */
export const ANSWER_SETS: Partial<Record<MathHandRegion, AnswerSet>> = {
  "number-valley": NUMBER_VALLEY_SET,
};
