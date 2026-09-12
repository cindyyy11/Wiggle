import type { PointerNdc } from "../../features/gestures/handMath";
import {
  MAGNET_OBJECTS,
  resultForMagnetObject,
  type MagnetObjectId,
  type MagnetResult,
} from "./scienceWorld";

export type MagnetCheckpoint = "explore" | "sort" | "hidden";
export type TablePoint = { x: number; y: number };

export type MagnetPlayState = {
  checkpoint: MagnetCheckpoint;
  explored: MagnetObjectId[];
  sorted: MagnetObjectId[];
  held: MagnetObjectId | null;
  foundHiddenMagnet: boolean;
};

export type MagnetPlayAction =
  | { type: "cancel"; id: MagnetObjectId }
  | { type: "observe"; id: MagnetObjectId }
  | { type: "grab"; id: MagnetObjectId }
  | { type: "drop"; id: MagnetObjectId; target: MagnetResult }
  | { type: "investigate"; target: string };

const TABLE_MARGIN = .07;
const MAGNET_FIELD_RADIUS = .18;
const clamp = (value: number) => Math.max(0, Math.min(1, value));
const tableCoordinate = (value: number) => Number(clamp(value).toFixed(4));

export const initialMagnetPlay: MagnetPlayState = {
  checkpoint: "explore",
  explored: [],
  sorted: [],
  held: null,
  foundHiddenMagnet: false,
};

/** Maps mirrored camera NDC into the padded tabletop while keeping outliers on the desk. */
export function handPointerToTable(pointer: PointerNdc): TablePoint {
  const usableRange = 1 - TABLE_MARGIN * 2;
  return {
    x: tableCoordinate(.5 + pointer.x * usableRange / 2),
    y: tableCoordinate(.5 + pointer.y * usableRange / 2),
  };
}

/** A deliberately generous radius lets small hand movements visibly attract nearby objects. */
export function isWithinMagnetField(magnet: TablePoint, object: TablePoint): boolean {
  return Math.hypot(magnet.x - object.x, magnet.y - object.y) <= MAGNET_FIELD_RADIUS;
}

/** Immutable curriculum state for the three Magnet Lab checkpoints. */
export function magnetPlayReducer(state: MagnetPlayState, action: MagnetPlayAction): MagnetPlayState {
  switch (action.type) {
    case "cancel":
      return state.held === action.id ? { ...state, held: null } : state;
    case "observe": {
      if (state.checkpoint !== "explore" || state.explored.includes(action.id)) return state;
      const explored = [...state.explored, action.id];
      return {
        ...state,
        explored,
        checkpoint: explored.length === MAGNET_OBJECTS.length ? "sort" : state.checkpoint,
      };
    }

    case "grab":
      if (state.checkpoint !== "sort" || state.held || state.sorted.includes(action.id)) return state;
      return { ...state, held: action.id };

    case "drop": {
      if (state.checkpoint !== "sort" || state.held !== action.id) return state;
      const result = resultForMagnetObject(action.id);
      const correct = action.target === result;
      if (!correct) return { ...state, held: null };

      const sorted = state.sorted.includes(action.id) ? state.sorted : [...state.sorted, action.id];
      return {
        ...state,
        held: null,
        sorted,
        checkpoint: sorted.length === MAGNET_OBJECTS.length ? "hidden" : state.checkpoint,
      };
    }

    case "investigate":
      if (state.checkpoint !== "hidden" || state.foundHiddenMagnet || action.target !== "toolbox") return state;
      return { ...state, foundHiddenMagnet: true };
  }
}
