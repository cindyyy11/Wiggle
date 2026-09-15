"use client";

import { useState } from "react";
import { getConstellationStars, type ConstellationStar, type ConstellationStarId, type LearnerTwin } from "@wiggle/contracts";
import styles from "./wiggleConstellation.module.css";

function StarMark({ unlocked }: { unlocked: boolean }) {
  return (
    <svg className={styles.mark} viewBox="0 0 32 32" aria-hidden="true">
      <path
        d="M16 2 L19.6 12 L30 13 L21.8 19.8 L24.5 30 L16 24 L7.5 30 L10.2 19.8 L2 13 L12.4 12 Z"
        fill={unlocked ? "#f4c95d" : "#8fb3cf"}
        stroke="#fff7e7"
        strokeWidth="1"
      />
    </svg>
  );
}

export interface WiggleConstellationProps {
  twin: LearnerTwin;
  /** Stars discovered in earlier visits, used only to render a "new!" cue — not to hide anything. */
  newlyUnlocked?: ReadonlySet<ConstellationStarId>;
}

/** "My Learning Constellation" — a glowing star map of strengths and strategies, no percentages. */
export function WiggleConstellation({ twin, newlyUnlocked }: WiggleConstellationProps) {
  const stars = getConstellationStars(twin);
  const [selected, setSelected] = useState<ConstellationStar | null>(null);
  return (
    <section className={styles.sky} aria-label="My Learning Constellation">
      <p className={styles.title}>My Learning Constellation</p>
      <div className={styles.grid}>
        {stars.map(star => (
          <button
            key={star.id}
            type="button"
            className={`${styles.star} ${star.unlocked ? styles.unlocked : styles.locked} ${newlyUnlocked?.has(star.id) ? styles.justUnlocked : ""}`}
            aria-pressed={selected?.id === star.id}
            aria-label={star.unlocked ? `${star.title}: ${star.description}` : `${star.title}: not discovered yet`}
            onClick={() => setSelected(current => (current?.id === star.id ? null : star))}
          >
            <StarMark unlocked={star.unlocked} />
            <span className={styles.label}>{star.title}{newlyUnlocked?.has(star.id) ? " ✨" : ""}</span>
          </button>
        ))}
      </div>
      {selected && (
        <p className={styles.detail} role="status">
          <strong>{selected.title}</strong>
          {selected.unlocked ? selected.description : "Keep exploring missions to discover this star."}
        </p>
      )}
    </section>
  );
}
