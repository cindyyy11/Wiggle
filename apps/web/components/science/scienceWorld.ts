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
  { id: "magnet-lab", name: "Magnet Lands", subtitle: "A campsite full of magnetic discoveries.", status: "available", color: "#83d49b", scenePosition: [-1.2, 0.9, 0.4] },
  { id: "animals", name: "Animal Types", subtitle: "Meet our horse, frog, bird and pond fish.", status: "available", color: "#79d7de", scenePosition: [1.25, -0.45, 0.4] },
  { id: "colors", name: "Colors Canyon", subtitle: "Mix and discover color.", status: "available", color: "#f4c95d", scenePosition: [-0.4, -1.25, 0.5] },
  { id: "life-cycle", name: "Life Cycle Garden", subtitle: "Watch life grow and change.", status: "available", color: "#7fbe86", scenePosition: [0.75, -1.2, 0.4] },
] as const satisfies readonly ScienceZone[];

export const MAGNET_OBJECTS = [
  { id: "paper-clip", name: "paper clip", result: "attracted", color: "#9aa7b4", scenePosition: [.14, .34], sceneKind: "clip" },
  { id: "iron-nail", name: "iron nail", result: "attracted", color: "#6f7882", scenePosition: [.86, .34], sceneKind: "nail" },
  { id: "wooden-block", name: "wooden block", result: "not-attracted", color: "#bd8556", scenePosition: [.14, .80], sceneKind: "block" },
  { id: "plastic-button", name: "plastic button", result: "not-attracted", color: "#6aa6cf", scenePosition: [.86, .80], sceneKind: "button" },
] as const satisfies readonly MagnetObject[];

/** Clear center rest spot — kept outside every object's magnet field. */
export const MAGNET_HOME: { readonly x: number; readonly y: number } = { x: .5, y: .55 };

export function resultForMagnetObject(id: MagnetObjectId): MagnetResult {
  const magnetObject = MAGNET_OBJECTS.find((object) => object.id === id);
  if (!magnetObject) throw new Error(`Unknown Magnet Lab object: ${id}`);
  return magnetObject.result;
}
