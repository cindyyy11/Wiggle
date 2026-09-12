"use client";

import type { CSSProperties } from "react";
import { SUBJECT_WORLDS, type SubjectWorldId } from "./subjectRoute";
import styles from "./SubjectWorlds.module.css";

export type WorldSelectorProps = {
  selectedWorld: SubjectWorldId;
  onSelect: (world: SubjectWorldId) => void;
  statusMessage: string;
};

export function WorldSelector({ selectedWorld, onSelect, statusMessage }: WorldSelectorProps) {
  return <section className={styles.selector} aria-label="Choose a subject world">
    <div className={styles.selectorIntro}>
      <img src="/brand/wiggle-mark.png" alt="Wiggle" />
      <p>YOUR LEARNING UNIVERSE</p>
      <h1>Choose your next world</h1>
      <span>Follow your curiosity. There is always something new to discover.</span>
    </div>
    <div className={styles.worldGrid}>
      {SUBJECT_WORLDS.map(world => <button
        key={world.id}
        type="button"
        className={styles.worldButton}
        style={{ "--world-accent": world.accent } as CSSProperties}
        aria-label={world.status === "available" ? `Explore ${world.name}` : `${world.name} (coming soon)`}
        aria-pressed={selectedWorld === world.id}
        aria-describedby={world.status === "coming-soon" ? "world-lock-status" : undefined}
        onClick={() => onSelect(world.id)}
      >
        <span className={styles.worldKicker}>{world.status === "available" ? "READY TO EXPLORE" : "ON ITS WAY"}</span>
        <strong>{world.status === "available" ? `Explore ${world.name}` : `${world.name} (coming soon)`}</strong>
      </button>)}
    </div>
    <p id="world-lock-status" className={styles.status} role="status" aria-live="polite">{statusMessage}</p>
  </section>;
}
