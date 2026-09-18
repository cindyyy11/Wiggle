import type { SubjectWorldId } from "./subjectRoute";

export type OrbitDecorationCounts = {
  stars: number;
  orbitalRocks: number;
  cloudPuffs: number;
  mathTrees: number;
  scienceFragments: number;
};

export type SubjectOrbitLayout = {
  position: readonly [number, number, number];
  scale: number;
  label: string;
  playable: boolean;
};

export const SUBJECT_ORBIT_LAYOUT: Record<SubjectWorldId, SubjectOrbitLayout> = {
  math: { position: [-2.15, -0.35, 0.15], scale: 1.35, label: "Numeria", playable: true },
  science: { position: [2, 0.05, -0.2], scale: 1.28, label: "Science Planet", playable: true },
  english: { position: [-3, 1.45, -1.2], scale: 0.38, label: "English", playable: false },
  bm: { position: [3, 1.3, -1.3], scale: 0.36, label: "Bahasa Melayu", playable: false },
};

export function orbitDecorationCounts(quality: "high" | "low"): OrbitDecorationCounts {
  return quality === "high"
    ? { stars: 96, orbitalRocks: 24, cloudPuffs: 8, mathTrees: 24, scienceFragments: 12 }
    : { stars: 36, orbitalRocks: 8, cloudPuffs: 4, mathTrees: 10, scienceFragments: 5 };
}

export function isOrbitPress(start: readonly [number, number], end: readonly [number, number]): boolean {
  return Math.hypot(end[0] - start[0], end[1] - start[1]) <= 12;
}
