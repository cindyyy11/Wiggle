"use client";

import { SCIENCE_ZONES, type ScienceZone } from "./scienceWorld";
import type { ScienceZoneId } from "../worlds/subjectRoute";
import styles from "./sciencePlanet.module.css";

export type ScienceHudProps = {
  selectedZone: ScienceZoneId;
  completedZones: ReadonlySet<ScienceZoneId>;
  onZoneSelect: (zone: ScienceZoneId) => void;
  onBackToWorlds: () => void;
  onStartMagnetLab: () => void;
  onExplore?: () => void;
  completionMessage?: string;
};

function selectedScienceZone(selectedZone: ScienceZoneId): ScienceZone {
  return SCIENCE_ZONES.find((zone) => zone.id === selectedZone) ?? SCIENCE_ZONES[0];
}

export function ScienceHud({ selectedZone, completedZones, onZoneSelect, onBackToWorlds, onStartMagnetLab, onExplore, completionMessage }: ScienceHudProps) {
  const zone = selectedScienceZone(selectedZone);
  const canStart = zone.id === "magnet-lab";
  const completedCount = SCIENCE_ZONES.filter((topic) => completedZones.has(topic.id)).length;

  return <header className={styles.hud}>
    <div className={styles.hudTopline}>
      <button className={styles.backButton} type="button" onClick={onBackToWorlds}>Back to Worlds</button>
      <p className={styles.eyebrow}>SCIENCE PLANET</p>
    </div>
    <div className={styles.topicControls} aria-label="Science topics">
      {SCIENCE_ZONES.map((topic) => {
        const complete = completedZones.has(topic.id);
        const completionDescriptionId = `science-zone-${topic.id}-completion`;
        return <button
          key={topic.id}
          className={styles.topicButton}
          type="button"
          aria-pressed={topic.id === selectedZone}
          aria-label={`Visit ${topic.name}`}
          aria-describedby={complete ? completionDescriptionId : undefined}
          onClick={() => onZoneSelect(topic.id)}
        >
          <span className={styles.topicDot} style={{ backgroundColor: topic.color }} aria-hidden="true" />
          <span className={styles.topicName}>{topic.name}</span>
          <span id={completionDescriptionId} className={styles.screenReaderOnly}>{complete ? "Complete" : null}</span>
          {complete ? <span className={styles.completeBadge} aria-hidden="true">Complete</span> : null}
        </button>;
      })}
    </div>
    <section className={styles.zoneCard} aria-label={`${zone.name} details`}>
      {!onExplore ? <p className={styles.zoneKicker}>{canStart ? "Ready to explore" : "Coming soon"}</p> : null}
      <h1>{zone.name}</h1>
      <p>{zone.subtitle}</p>
      {onExplore ? <button className={styles.startButton} type="button" onClick={onExplore}>Explore {zone.name}</button> : canStart
        ? <button className={styles.startButton} type="button" onClick={onStartMagnetLab}>Explore Magnet Lands</button>
        : <p className={styles.comingSoon} role="status">Coming soon — you can visit another discovery spot while this one is being prepared.</p>}
      {completionMessage ? <p className={styles.returnMessage} role="status" aria-live="polite">{completionMessage}</p> : null}
      <p
        className={completedCount === 0 ? `${styles.completionStatus} ${styles.quiet}` : styles.completionStatus}
        role={completionMessage ? undefined : "status"}
        aria-live="polite"
      >
        {completedCount} of {SCIENCE_ZONES.length} lands complete
      </p>
    </section>
  </header>;
}
