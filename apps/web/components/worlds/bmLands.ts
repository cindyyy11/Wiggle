import type { Destination } from "../universe/world";

/** Batik-and-hibiscus jewel-tone palette for the Bahasa Melayu planet — kept distinct from Science's pastel nature tones and English's storybook rainbow. */
export const BM_LANDS = [
  { id: "kebun-bunga-raya", name: "Kebun Bunga Raya", color: "#d81159", destination: { latitude: .62, longitude: -.52 } },
  { id: "bukit-batik", name: "Bukit Batik", color: "#0f9b8e", destination: { latitude: -.16, longitude: .43 } },
  { id: "lereng-emas", name: "Lereng Emas", color: "#f2a71b", destination: { latitude: .71, longitude: .72 } },
  { id: "dataran-wau", name: "Dataran Wau", color: "#5b2a86", destination: { latitude: -.25, longitude: -.73 } },
] as const satisfies readonly { id: string; name: string; color: string; destination: Destination }[];
