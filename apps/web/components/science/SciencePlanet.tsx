"use client";

import { SciencePlanetCanvas } from "./SciencePlanetCanvas";
import type { ScienceZoneId } from "../worlds/subjectRoute";
import type { QualityPreference } from "../universe/world";

export type SciencePlanetProps = {
  selectedZone: ScienceZoneId;
  quality?: QualityPreference;
  onZoneSelect: (zone: ScienceZoneId) => void;
  onBackToWorlds: () => void;
};

export function SciencePlanet({ selectedZone, quality, onZoneSelect, onBackToWorlds }: SciencePlanetProps) {
  return <>
    <SciencePlanetCanvas
      selectedZone={selectedZone}
      quality={quality}
      onZoneSelect={onZoneSelect}
      onBackToWorlds={onBackToWorlds}
    />
  </>;
}
