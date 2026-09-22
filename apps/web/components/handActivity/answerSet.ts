import type { ComponentType } from "react";
import type { MathChallenge, MathRegionId, MathVisual } from "../math/mathActivities";
import type { BenchPoint } from "./handBenchPlay";

/** What a region's puzzle draws. `answer` is null while the puzzle is asked and the correct option once it is solved. */
export type PuzzleProps = { challenge: MathChallenge; answer: string | null; reducedMotion: boolean };
/** What an answer token can react to. The scene draws the hold ring and does the wobble itself. */
export type TokenProps = { label: string; hovered: boolean; solved: boolean; reducedMotion: boolean };

/** Three spots along the bottom of the bench. Every region uses the same row so a child learns where answers are. */
export const ANSWER_TOKEN_HOMES: readonly BenchPoint[] = [{ x: .18, y: .2 }, { x: .5, y: .2 }, { x: .82, y: .2 }];
/** A hit area in bench units. Wider than the drawn gem on purpose: a hand is less exact than a mouse. */
export const ANSWER_TOKEN_RADIUS = .155;

/** One region's 3D content. The engine only ever sees option text and coordinates from this. */
export type AnswerSet = {
  region: MathRegionId;
  /** Accessible name for the 3D view, e.g. "Number Valley workbench". */
  label: string;
  /** The kind of picture this set draws; every challenge in the region must use it. */
  visual: MathVisual["kind"];
  /** One spot per option, in option order. */
  tokens: readonly BenchPoint[];
  tokenRadius: number;
  Scenery: ComponentType;
  Puzzle: ComponentType<PuzzleProps>;
  Token: ComponentType<TokenProps>;
};
