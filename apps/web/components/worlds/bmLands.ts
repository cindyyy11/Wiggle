import type { Destination } from "../universe/world";

/** Locked-world grey palette — this planet reads as "coming soon" (see [[subjectRoute]]'s "???" naming), so its jewel-tone batik colors are muted to grey until it unlocks. */
export const BM_LANDS = [
  { id: "kebun-bunga-raya", name: "Kebun Bunga Raya", color: "#9aa1ab", destination: { latitude: .62, longitude: -.52 } },
  { id: "bukit-batik", name: "Bukit Batik", color: "#b3b9c2", destination: { latitude: -.16, longitude: .43 } },
  { id: "lereng-emas", name: "Lereng Emas", color: "#7d8590", destination: { latitude: .71, longitude: .72 } },
  { id: "dataran-wau", name: "Dataran Wau", color: "#c7cdd4", destination: { latitude: -.25, longitude: -.73 } },
] as const satisfies readonly { id: string; name: string; color: string; destination: Destination }[];
