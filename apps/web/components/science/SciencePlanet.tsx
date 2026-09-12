"use client";

import { useState } from "react";
import { MagnetLabMission } from "./MagnetLabMission";
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
  const [magnetLabOpen, setMagnetLabOpen] = useState(false);
  const [magnetComplete, setMagnetComplete] = useState(false);

  if (magnetLabOpen) {
    return <MagnetLabMission
      onExit={() => setMagnetLabOpen(false)}
      onComplete={() => {
        setMagnetComplete(true);
        setMagnetLabOpen(false);
      }}
    />;
  }

  return <>
    <SciencePlanetCanvas
      selectedZone={selectedZone}
      quality={quality}
      onZoneSelect={onZoneSelect}
      onBackToWorlds={onBackToWorlds}
      onStartMagnetLab={() => setMagnetLabOpen(true)}
      completionMessage={magnetComplete ? "Magnet Lab discovery complete." : undefined}
    />
  </>;
}
