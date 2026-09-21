import type { BenchSet } from "../benchSet";
import { ANIMAL_SET } from "./AnimalSet";

/** Each Science land's 3D set, keyed by land id. */
export const BENCH_SETS: Record<string, BenchSet | undefined> = {
  animals: ANIMAL_SET,
};
