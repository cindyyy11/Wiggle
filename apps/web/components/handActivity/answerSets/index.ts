import type { AnswerSet } from "../answerSet";
import { CRYSTAL_CRATER_SET } from "./CrystalCraterSet";
import { GEOMETRY_RIDGE_SET } from "./GeometryRidgeSet";
import { NUMBER_VALLEY_SET } from "./NumberValleySet";

/** The three Numeria regions that are played with the hand. Fraction Forest has its own mission. */
export type MathHandRegion = "number-valley" | "geometry-ridge" | "crystal-crater";

/** Each hand-played region's 3D set, keyed by region id. */
export const ANSWER_SETS: Partial<Record<MathHandRegion, AnswerSet>> = {
  "number-valley": NUMBER_VALLEY_SET,
  "geometry-ridge": GEOMETRY_RIDGE_SET,
  "crystal-crater": CRYSTAL_CRATER_SET,
};

/** The hand-played set for a region id, or undefined for a region that is not (yet) hand-played. */
export function answerSetFor(region: string): AnswerSet | undefined {
  return Object.prototype.hasOwnProperty.call(ANSWER_SETS, region) ? ANSWER_SETS[region as MathHandRegion] : undefined;
}
