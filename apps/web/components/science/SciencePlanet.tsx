"use client";

import { SciencePlanetCanvas } from "./SciencePlanetCanvas";
import type { ScienceZoneId } from "../worlds/subjectRoute";
import type { QualityPreference } from "../universe/world";

export type SciencePlanetProps = {
  selectedZone: ScienceZoneId;
  quality?: QualityPreference;
  childId?: string;
  onZoneSelect: (zone: ScienceZoneId) => void;
  onBackToWorlds: () => void;
  onSessionOpenChange?: (open: boolean) => void;
};

export function SciencePlanet({ selectedZone, quality, childId, onZoneSelect, onBackToWorlds, onSessionOpenChange }: SciencePlanetProps) {
  return <>
    <SciencePlanetCanvas
      selectedZone={selectedZone}
      quality={quality}
      childId={childId}
      onZoneSelect={onZoneSelect}
      onBackToWorlds={onBackToWorlds}
      onSessionOpenChange={onSessionOpenChange}
    />
  </>;
}
