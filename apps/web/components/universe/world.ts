import type { MutableRefObject } from "react";

export type CameraMode = "globe" | "follow" | "mission";
export type QualityPreference = "auto" | "high" | "low" | "fallback";
export type SceneQuality = Exclude<QualityPreference, "auto">;
export type Destination = { latitude: number; longitude: number };
export type LandmarkId = "fraction-forest" | "number-valley" | "geometry-ridge" | "crystal-crater" | "lexi";
export type Landmark = { id: LandmarkId; name: string; subtitle: string; color: string; destination: Destination; symbol: string };

export const RADIUS = 3;
export const LANDMARKS: readonly Landmark[] = [
  { id: "fraction-forest", name: "Fraction Forest", subtitle: "Little pieces. Big discoveries.", color: "#87e4b9", destination: { latitude: .62, longitude: -.52 }, symbol: "¼" },
  { id: "number-valley", name: "Number Valley", subtitle: "Every number has a place.", color: "#f5c77f", destination: { latitude: -.16, longitude: .43 }, symbol: "123" },
  { id: "geometry-ridge", name: "Geometry Ridge", subtitle: "A world of shapes awaits.", color: "#99def4", destination: { latitude: .71, longitude: .72 }, symbol: "△" },
  { id: "crystal-crater", name: "Crystal Crater", subtitle: "Follow your curiosity.", color: "#c9a9ee", destination: { latitude: -.25, longitude: -.73 }, symbol: "◇" },
  { id: "lexi", name: "Lexi's beacon", subtitle: "A little light to guide you.", color: "#faf1b1", destination: { latitude: .27, longitude: -.05 }, symbol: "✧" },
];
export const INITIAL_DESTINATION: Destination = { latitude: .12, longitude: .08 };
export const MISSION_DESTINATION = LANDMARKS[0].destination;

export function surfacePoint(destination: Destination, radius = RADIUS): [number, number, number] {
  const latitude = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, destination.latitude));
  return [Math.cos(latitude) * Math.sin(destination.longitude) * radius, Math.sin(latitude) * radius, Math.cos(latitude) * Math.cos(destination.longitude) * radius];
}

export function destinationFromPoint(x: number, y: number, z: number): Destination {
  return { latitude: Math.atan2(y, Math.hypot(x, z)), longitude: Math.atan2(x, z) };
}

export function resolveQuality(preference: QualityPreference, webgl: boolean, memory = 8, cores = 8): SceneQuality {
  if (preference === "fallback" || !webgl) return "fallback";
  if (preference !== "auto") return preference;
  if (memory <= 2 || cores <= 2) return "fallback";
  return memory <= 4 || cores <= 4 ? "low" : "high";
}

// Pointer, touch, keyboard and external destinations feed one frame-owned controller.
export type ExplorerInput = {
  keys: Set<string>;
  horizontal: number;
  vertical: number;
  hop: boolean;
  running: boolean;
  destination: Destination | null;
  position: [number, number, number];
  zoom: number;
};
export type InputRef = MutableRefObject<ExplorerInput>;
export function createExplorerInput(): ExplorerInput {
  return { keys: new Set(), horizontal: 0, vertical: 0, hop: false, running: false, destination: null, position: surfacePoint(INITIAL_DESTINATION, RADIUS + .05), zoom: 0 };
}

export type PizzaPresentation = { visible: boolean; selectedSlices: readonly number[]; onSliceSelect?: (index: number) => void };
export type UniverseSceneProps = {
  mode: CameraMode;
  quality: "high" | "low";
  reducedMotion: boolean;
  input: InputRef;
  selectedLandmark: LandmarkId;
  onLandmarkSelect: (id: LandmarkId) => void;
  onDestinationChange?: (destination: Destination) => void;
  onContextLost: () => void;
  onQualityChange: (quality: "low") => void;
  pizza?: PizzaPresentation;
};
