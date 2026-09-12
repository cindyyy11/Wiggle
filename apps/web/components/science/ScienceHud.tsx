"use client";

import { SCIENCE_ZONES, type ScienceZone } from "./scienceWorld";
import type { ScienceZoneId } from "../worlds/subjectRoute";
import styles from "./sciencePlanet.module.css";

export type ScienceHudProps = {
  selectedZone: ScienceZoneId;
  onZoneSelect: (zone: ScienceZoneId) => void;
  onBackToWorlds: () => void;
  onStartMagnetLab: () => void;
};

function selectedScienceZone(selectedZone: ScienceZoneId): ScienceZone {
  return SCIENCE_ZONES.find((zone) => zone.id === selectedZone) ?? SCIENCE_ZONES[0];
}

export function ScienceHud({ selectedZone, onZoneSelect, onBackToWorlds, onStartMagnetLab }: ScienceHudProps) {
  const zone = selectedScienceZone(selectedZone);
  const canStart = zone.id === "magnet-lab";

  return <header className={styles.hud}>
    <div className={styles.hudTopline}>
      <button className={styles.backButton} type="button" onClick={onBackToWorlds}>Back to Worlds</button>
      <p className={styles.eyebrow}>SCIENCE PLANET</p>
    </div>
    <div className={styles.topicControls} aria-label="Science topics">
      {SCIENCE_ZONES.map((topic) => <button
        key={topic.id}
        className={styles.topicButton}
        type="button"
        aria-pressed={topic.id === selectedZone}
        aria-label={`Visit ${topic.name}`}
        onClick={() => onZoneSelect(topic.id)}
      >
        <span className={styles.topicDot} style={{ backgroundColor: topic.color }} aria-hidden="true" />
        {topic.name}
      </button>)}
    </div>
    <section className={styles.zoneCard} aria-label={`${zone.name} details`}>
      <p className={styles.zoneKicker}>{canStart ? "Ready to explore" : "Coming soon"}</p>
      <h1>{zone.name}</h1>
      <p>{zone.subtitle}</p>
      {canStart
        ? <button className={styles.startButton} type="button" onClick={onStartMagnetLab}>Start Magnet Lab</button>
        : <p className={styles.comingSoon} role="status">Coming soon — you can visit another discovery spot while this one is being prepared.</p>}
    </section>
  </header>;
}
