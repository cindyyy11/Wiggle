"use client";

import type { ApiClient } from "../../lib/api/client";
import type { QualityPreference } from "../universe/world";
import { MathPlanetCanvas } from "./MathPlanetCanvas";

export { MATHS_MISSION_BLOCKED_MESSAGE } from "./mathNavigation";

export type MathPlanetProps = {
  quality?: QualityPreference;
  reducedMotion?: boolean;
  childId?: string;
  allowLocalFallback?: boolean;
  client?: ApiClient;
  onBackToWorlds: () => void;
  onSessionOpenChange?: (open: boolean) => void;
};

export function MathPlanet(props: MathPlanetProps) {
  return <section aria-label="Numeria"><MathPlanetCanvas {...props} /></section>;
}
