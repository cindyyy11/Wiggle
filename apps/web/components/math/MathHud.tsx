"use client";

import { Gem, ListOrdered, Shapes, Trees, type LucideIcon } from "lucide-react";
import { MATH_ACTIVITIES, type MathRegionId } from "./mathActivities";
import styles from "./mathPlanet.module.css";

const REGION_IDS = Object.keys(MATH_ACTIVITIES) as MathRegionId[];

const REGION_ICONS: Record<MathRegionId, LucideIcon> = {
  "fraction-forest": Trees,
  "number-valley": ListOrdered,
  "geometry-ridge": Shapes,
  "crystal-crater": Gem,
};

export type MathHudProps = {
  selectedRegion: MathRegionId;
  completedRegions: ReadonlySet<MathRegionId>;
  onRegionSelect: (region: MathRegionId) => void;
  onExplore: () => void;
  onBackToWorlds: () => void;
};

export function MathHud({ selectedRegion, completedRegions, onRegionSelect, onExplore, onBackToWorlds }: MathHudProps) {
  const region = MATH_ACTIVITIES[selectedRegion];
  const completedCount = REGION_IDS.filter((id) => completedRegions.has(id)).length;

  return <header className={styles.hud}>
    <div className={styles.hudTopline}>
      <button className={styles.backButton} type="button" onClick={onBackToWorlds}>Back to Worlds</button>
      <p className={styles.eyebrow}>NUMERIA</p>
    </div>

    <nav className={styles.topicControls} aria-label="Numeria regions">
      {REGION_IDS.map((id) => {
        const topic = MATH_ACTIVITIES[id];
        const Icon = REGION_ICONS[id];
        const complete = completedRegions.has(id);
        const completionDescriptionId = `math-region-${id}-completion`;

        return <button
          key={id}
          className={styles.topicButton}
          type="button"
          aria-label={`Visit ${topic.name}`}
          aria-describedby={complete ? completionDescriptionId : undefined}
          aria-pressed={id === selectedRegion}
          onClick={() => onRegionSelect(id)}
        >
          <Icon aria-hidden="true" size={18} />
          <span className={styles.topicName}>{topic.name}</span>
          <span className={styles.topicDot} style={{ backgroundColor: topic.color }} aria-hidden="true" />
          <span id={completionDescriptionId} className={styles.completeBadge} hidden={!complete}>Complete</span>
        </button>;
      })}
    </nav>

    <section className={styles.regionCard} aria-label={`${region.name} details`}>
      <p className={styles.regionKicker}>Ready to explore</p>
      <h1>{region.name}</h1>
      <p>{region.subtitle}</p>
      <p className={styles.instruction}>{region.instruction}</p>
      <button className={styles.exploreButton} type="button" onClick={onExplore}>Explore {region.name}</button>
      <p className={styles.completionStatus} role="status" aria-live="polite">
        {completedCount} of {REGION_IDS.length} regions complete
      </p>
    </section>
  </header>;
}
