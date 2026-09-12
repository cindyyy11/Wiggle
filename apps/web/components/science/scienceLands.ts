import type { Destination } from "../universe/world";
import type { ScienceZoneId } from "../worlds/subjectRoute";
export const SCIENCE_LANDS = [
  { id: "magnet-lab", name: "Magnet Lands", color: "#83d49b", destination: { latitude: .62, longitude: -.52 } },
  { id: "animals", name: "Animal Types", color: "#79d7de", destination: { latitude: -.16, longitude: .43 } },
  { id: "colors", name: "Colors Canyon", color: "#e7a1eb", destination: { latitude: .71, longitude: .72 } },
  { id: "life-cycle", name: "Life Cycle Garden", color: "#dfcf73", destination: { latitude: -.25, longitude: -.73 } },
] as const satisfies readonly { id: ScienceZoneId; name: string; color: string; destination: Destination }[];
export function scienceLand(id: ScienceZoneId) { return SCIENCE_LANDS.find(land => land.id === id) ?? SCIENCE_LANDS[0]; }
