import type { Destination } from "../universe/world";

/** Aurora-candy palette for Nova — a real, colorful planet like Numeria and Science, just not open yet (see [[SubjectWorlds]]'s "coming soon" copy). Unlike the BM/English mystery worlds it is never greyed out. */
export const NOVA_LANDS = [
  { id: "glow-dunes", name: "Glow Dunes", color: "#ff9f68", destination: { latitude: .62, longitude: -.52 } },
  { id: "aurora-reef", name: "Aurora Reef", color: "#5ec8d8", destination: { latitude: -.16, longitude: .43 } },
  { id: "lilac-summit", name: "Lilac Summit", color: "#c792ea", destination: { latitude: .71, longitude: .72 } },
  { id: "comet-fields", name: "Comet Fields", color: "#ffe066", destination: { latitude: -.25, longitude: -.73 } },
] as const satisfies readonly { id: string; name: string; color: string; destination: Destination }[];
