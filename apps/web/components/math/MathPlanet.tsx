"use client";

import type { QualityPreference } from "../universe/world";
import { MathPlanetCanvas } from "./MathPlanetCanvas";

export type MathPlanetProps = {
  quality?: QualityPreference;
  reducedMotion?: boolean;
  onBackToWorlds: () => void;
  onSessionOpenChange?: (open: boolean) => void;
};

export function MathPlanet(props: MathPlanetProps) {
  return <section aria-label="Numeria"><MathPlanetCanvas {...props} /></section>;
}
