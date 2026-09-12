import type { ScienceZoneId } from "../worlds/subjectRoute";

export type MagnetObjectId = "paper-clip" | "iron-nail" | "wooden-block" | "plastic-button";
export type MagnetResult = "attracted" | "not-attracted";

export type MagnetObject = {
  id: MagnetObjectId;
  name: string;
  result: MagnetResult;
  color: string;
  scenePosition: readonly [number, number];
  sceneKind: "clip" | "nail" | "block" | "button";
};

export type ScienceZone = {
  id: ScienceZoneId;
  name: string;
  subtitle: string;
  status: "available" | "coming-soon";
  color: string;
  scenePosition: readonly [number, number, number];
};

export const SCIENCE_ZONES = [
  { id: "magnet-lab", name: "Magnet Lab", subtitle: "See what moves toward a magnet.", status: "available", color: "#ef8b78", scenePosition: [-1.2, 0.9, 0.4] },
  { id: "sink-float", name: "Sink & Float Bay", subtitle: "Will it sink or float?", status: "coming-soon", color: "#73c6e8", scenePosition: [1.3, 1.0, 0.2] },
  { id: "ph-lab", name: "pH Lab", subtitle: "Explore careful color changes.", status: "coming-soon", color: "#b68fd8", scenePosition: [-1.4, -0.5, 0.6] },
  { id: "animals", name: "Animal Arena", subtitle: "Meet different animal families.", status: "coming-soon", color: "#9dc99a", scenePosition: [1.25, -0.45, 0.4] },
  { id: "colors", name: "Colors Canyon", subtitle: "Mix and discover color.", status: "coming-soon", color: "#f4c95d", scenePosition: [-0.4, -1.25, 0.5] },
  { id: "life-cycle", name: "Life Cycle Garden", subtitle: "Watch life grow and change.", status: "coming-soon", color: "#7fbe86", scenePosition: [0.75, -1.2, 0.4] },
] as const satisfies readonly ScienceZone[];

export const MAGNET_OBJECTS = [
  { id: "paper-clip", name: "paper clip", result: "attracted", color: "#9aa7b4", scenePosition: [.22, .28], sceneKind: "clip" },
  { id: "iron-nail", name: "iron nail", result: "attracted", color: "#6f7882", scenePosition: [.73, .3], sceneKind: "nail" },
  { id: "wooden-block", name: "wooden block", result: "not-attracted", color: "#bd8556", scenePosition: [.3, .72], sceneKind: "block" },
  { id: "plastic-button", name: "plastic button", result: "not-attracted", color: "#6aa6cf", scenePosition: [.7, .7], sceneKind: "button" },
] as const satisfies readonly MagnetObject[];

export function resultForMagnetObject(id: MagnetObjectId): MagnetResult {
  const magnetObject = MAGNET_OBJECTS.find((object) => object.id === id);
  if (!magnetObject) throw new Error(`Unknown Magnet Lab object: ${id}`);
  return magnetObject.result;
}
