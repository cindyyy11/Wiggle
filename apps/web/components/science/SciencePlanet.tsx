"use client";

import { useState } from "react";
import { MagnetLabMission } from "./MagnetLabMission";
import { ScienceFallback } from "./ScienceFallback";
import type { ScienceZoneId } from "../worlds/subjectRoute";
import type { QualityPreference } from "../universe/world";

export type SciencePlanetProps = {
  selectedZone: ScienceZoneId;
  quality?: QualityPreference;
  onZoneSelect: (zone: ScienceZoneId) => void;
  onBackToWorlds: () => void;
};

export function SciencePlanet({ selectedZone, quality: _quality, onZoneSelect, onBackToWorlds }: SciencePlanetProps) {
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
    <ScienceFallback
      selectedZone={selectedZone}
      onZoneSelect={onZoneSelect}
      onBackToWorlds={onBackToWorlds}
      onStartMagnetLab={() => setMagnetLabOpen(true)}
    />
    {magnetComplete ? <p role="status" aria-live="polite">Magnet Lab discovery complete.</p> : null}
  </>;
}
