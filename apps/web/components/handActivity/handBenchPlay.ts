import type { PointerNdc } from "../../features/gestures/handMath";

export type BenchPoint = { x: number; y: number };
/** A circular hit area on the bench, in bench coordinates (0 to 1 on both axes, y up). */
export type BenchZone = { id: string; at: BenchPoint; radius: number };
export type BenchPhase = "discover" | "match" | "done";
export type BenchState = { phase: BenchPhase; observed: string[]; matched: string[]; held: string | null };
export type BenchRules = { itemIds: readonly string[]; targetFor(itemId: string): string | undefined };
export type BenchAction =
  | { type: "observe"; id: string }
  | { type: "advance" }
  | { type: "grab"; id: string }
  | { type: "drop"; id: string; target: string }
  | { type: "cancel"; id: string };

export const initialBenchState: BenchState = { phase: "discover", observed: [], matched: [], held: null };

const BENCH_MARGIN = .07;
const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
const round = (value: number) => Number(clamp01(value).toFixed(4));

/** Maps mirrored camera NDC onto the padded bench while keeping outliers on it. */
export function handPointerToBench(pointer: PointerNdc): BenchPoint {
  const usableRange = 1 - BENCH_MARGIN * 2;
  return { x: round(.5 + pointer.x * usableRange / 2), y: round(.5 + pointer.y * usableRange / 2) };
}

/** The id of the nearest zone containing the point, or null. */
export function benchHit(point: BenchPoint, zones: readonly BenchZone[]): string | null {
  let best: string | null = null;
  let bestDistance = Infinity;
  for (const zone of zones) {
    const distance = Math.hypot(point.x - zone.at.x, point.y - zone.at.y);
    if (distance <= zone.radius && distance < bestDistance) { best = zone.id; bestDistance = distance; }
  }
  return best;
}

/** Immutable lesson state: discover every item, then match each to its target. */
export function benchReducer(rules: BenchRules, state: BenchState, action: BenchAction): BenchState {
  switch (action.type) {
    case "observe":
      if (state.phase !== "discover" || state.observed.includes(action.id) || !rules.itemIds.includes(action.id)) return state;
      return { ...state, observed: [...state.observed, action.id] };
    case "advance":
      if (state.phase !== "discover" || state.observed.length !== rules.itemIds.length) return state;
      return { ...state, phase: "match" };
    case "grab":
      if (state.phase !== "match" || state.held || state.matched.includes(action.id) || !rules.itemIds.includes(action.id)) return state;
      return { ...state, held: action.id };
    case "cancel":
      return state.held === action.id ? { ...state, held: null } : state;
    case "drop": {
      if (state.phase !== "match" || state.held !== action.id) return state;
      if (rules.targetFor(action.id) !== action.target) return { ...state, held: null };
      const matched = [...state.matched, action.id];
      return { ...state, held: null, matched, phase: matched.length === rules.itemIds.length ? "done" : "match" };
    }
  }
}
