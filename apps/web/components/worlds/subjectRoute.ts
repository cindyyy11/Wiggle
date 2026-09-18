export type SubjectWorldId = "science" | "math" | "english" | "bm" | "nova";
export type EnterableWorldId = "science" | "math";
export type ScienceZoneId =
  | "magnet-lab"
  | "sink-float"
  | "ph-lab"
  | "animals"
  | "colors"
  | "life-cycle";

export type SubjectWorld = {
  id: SubjectWorldId;
  name: string;
  status: "available" | "coming-soon";
  accent: string;
  /** A locked world whose identity is intentionally hidden (name replaced with "???", planet rendered grey) rather than merely not-yet-enterable. */
  mystery?: boolean;
};

export type SubjectRoute =
  | { world: "science"; zone: ScienceZoneId; child?: string }
  | { world: "math"; child?: string }
  | { world: null; child?: string };

const SCIENCE_ZONE_IDS: readonly ScienceZoneId[] = [
  "magnet-lab",
  "sink-float",
  "ph-lab",
  "animals",
  "colors",
  "life-cycle",
];

export const SUBJECT_WORLDS: readonly SubjectWorld[] = [
  {
    id: "science",
    name: "Science Planet",
    status: "available",
    accent: "linear-gradient(135deg, #a9d9ee, #ef8b78 55%, #f4c95d)",
  },
  {
    id: "math",
    name: "Numeria",
    status: "available",
    accent: "#9dc99a",
  },
  {
    id: "english",
    name: "???",
    status: "coming-soon",
    accent: "#a99bc8",
    mystery: true,
  },
  {
    id: "bm",
    name: "???",
    status: "coming-soon",
    accent: "#8dab9a",
    mystery: true,
  },
  {
    id: "nova",
    name: "Nova",
    status: "coming-soon",
    accent: "#f2b56b",
  },
];

/** Carousel/swipe order for the Worlds hub — also the source of the arrow buttons' first/last bounds in [[WorldSelector]]. */
export const SUBJECT_WORLD_ORDER: readonly SubjectWorldId[] = ["math", "science", "bm", "english", "nova"];

export const DEFAULT_SCIENCE_ZONE: ScienceZoneId = "magnet-lab";

export function isEnterableWorld(id: SubjectWorldId): id is EnterableWorldId {
  return id === "science" || id === "math";
}

export function parseSubjectRoute(input: URLSearchParams): SubjectRoute {
  const child = input.get("child") || undefined;
  const world = input.get("world");
  if (world === "math") return { world: "math", child };
  if (world === "science") {
    const requestedZone = input.get("zone") as ScienceZoneId;
    const zone = SCIENCE_ZONE_IDS.includes(requestedZone) && requestedZone !== "ph-lab" && requestedZone !== "sink-float"
      ? requestedZone
      : DEFAULT_SCIENCE_ZONE;
    return { world: "science", zone, child };
  }
  return { world: null, child };
}

export function buildWorldHref(route: SubjectRoute): string {
  const query = new URLSearchParams();
  if (route.child) query.set("child", route.child);
  if (route.world === "science") {
    query.set("world", "science");
    query.set("zone", route.zone);
  }
  if (route.world === "math") query.set("world", "math");
  const search = query.toString();
  return search ? `/?${search}` : "/";
}
