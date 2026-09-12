"use client";

import type { CSSProperties } from "react";
import { SCIENCE_ZONES } from "./scienceWorld";
import { ScienceHud } from "./ScienceHud";
import type { ScienceZoneId } from "../worlds/subjectRoute";
import styles from "./sciencePlanet.module.css";

export type ScienceFallbackProps = {
  selectedZone: ScienceZoneId;
  onZoneSelect: (zone: ScienceZoneId) => void;
  onBackToWorlds: () => void;
  onStartMagnetLab: () => void;
};

export function ScienceFallback(props: ScienceFallbackProps) {
  return <main className={styles.planet} aria-label="Science Planet">
    <ScienceHud {...props} />
    <section className={styles.map}>
      <div className={styles.mapVisual} role="img" aria-label="Science Planet map">
        <div className={styles.mapOrbit} />
        <div className={styles.mapCore}><span>Science<br />Planet</span></div>
      </div>
      <div className={styles.mapZones}>
        {SCIENCE_ZONES.map((zone, index) => <button
          key={zone.id}
          className={styles.mapZone}
          type="button"
          aria-pressed={zone.id === props.selectedZone}
          aria-label={`Map point: ${zone.name}`}
          onClick={() => props.onZoneSelect(zone.id)}
          style={{ "--zone-color": zone.color, "--zone-index": index } as CSSProperties}
        >
          <span className={styles.mapZoneMarker} aria-hidden="true">{index + 1}</span>
          <span>{zone.name}</span>
        </button>)}
      </div>
    </section>
    <p className={styles.mapHint}>Choose any numbered discovery spot on the map, or use the topic buttons above.</p>
  </main>;
}
