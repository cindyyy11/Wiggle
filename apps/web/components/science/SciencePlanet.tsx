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
  const [focusLabEntry, setFocusLabEntry] = useState(false);

  if (magnetLabOpen) {
    return <MagnetLabMission
      onExit={() => { setFocusLabEntry(true); setMagnetLabOpen(false); }}
      onComplete={() => {
        setMagnetComplete(true);
        setFocusLabEntry(true);
        setMagnetLabOpen(false);
      }}
    />;
  }

  return <>
    <SciencePlanetCanvas
      selectedZone={selectedZone}
      quality={quality}
      onZoneSelect={(zone) => { setFocusLabEntry(false); onZoneSelect(zone); }}
      onBackToWorlds={onBackToWorlds}
      onStartMagnetLab={() => setMagnetLabOpen(true)}
      focusLabEntry={focusLabEntry}
      completionMessage={magnetComplete ? "Magnet Lab discovery complete." : undefined}
    />
  </>;
}
