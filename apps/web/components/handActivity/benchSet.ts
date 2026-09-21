import type { ComponentType } from "react";
import type { BenchPoint } from "./handBenchPlay";

/** Presentation state a 3D item model can react to. Models draw around their own origin. */
export type ItemModelProps = { held: boolean; hovered: boolean; matched: boolean; reducedMotion: boolean };
/** Presentation state a target pad can react to. Pads draw around their own origin, facing the camera. */
export type PadProps = { active: boolean; filled: boolean; reducedMotion: boolean };

/** All positions are bench coordinates: 0 to 1 on both axes, y up. Radii are hit areas in the same units. */
export type BenchSetItem = { id: string; home: BenchPoint; radius: number; Model: ComponentType<ItemModelProps> };
export type BenchSetTarget = {
  id: string;
  at: BenchPoint;
  radius: number;
  /** Where a matched item settles, as an offset from `at`. */
  settle: BenchPoint;
  Pad: ComponentType<PadProps>;
};

/** One land's 3D content. The engine only ever sees ids and coordinates from this. */
export type BenchSet = {
  land: string;
  /** Accessible name for the 3D view, e.g. "Animal Types workbench". */
  label: string;
  items: BenchSetItem[];
  targets: BenchSetTarget[];
  Scenery: ComponentType;
};
