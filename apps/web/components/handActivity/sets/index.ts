import type { BenchSet } from "../benchSet";
import { ANIMAL_SET } from "./AnimalSet";
import { COLOR_SET } from "./ColorSet";
import { LIFE_CYCLE_SET } from "./LifeCycleSet";

/** Each Science land's 3D set, keyed by land id. */
export const BENCH_SETS: Record<string, BenchSet | undefined> = {
  animals: ANIMAL_SET,
  colors: COLOR_SET,
  "life-cycle": LIFE_CYCLE_SET,
};
