"use client";

import { SUBJECT_WORLDS, type SubjectWorldId } from "./subjectRoute";
import styles from "./SubjectWorlds.module.css";

export type WorldSelectorProps = {
  activeWorld: SubjectWorldId | null;
  onActiveWorldChange: (world: SubjectWorldId | null) => void;
  onSelect: (world: SubjectWorldId) => void;
  statusMessage: string;
};

const WORLD_CONTROL_ORDER = ["math", "science", "english", "bm"] as const;

export function WorldSelector({ activeWorld, onActiveWorldChange, onSelect, statusMessage }: WorldSelectorProps) {
  return <section className={styles.selector} aria-label="Choose a subject world">
    <header className={styles.orbitIntro}>
      <img src="/brand/wiggle-mark.png" alt="Wiggle" />
      <p>Your learning universe</p>
      <h1>Choose a world to explore</h1>
    </header>
    <div className={styles.worldHotspots} role="group" aria-label="World portals">
      {WORLD_CONTROL_ORDER.map(id => {
        const world = SUBJECT_WORLDS.find(item => item.id === id)!;
        const locked = world.status === "coming-soon";
        const label = locked ? `${world.name} (coming soon)` : `Explore ${world.name}`;
        const controlName = `planetControl${id[0].toUpperCase()}${id.slice(1)}`;
        return <button
        key={world.id}
        type="button"
        className={`${styles.planetControl} ${styles[controlName]}`}
        data-active={String(activeWorld === id)}
        aria-label={label}
        aria-describedby={locked ? "world-lock-status" : undefined}
        onFocus={() => onActiveWorldChange(id)}
        onBlur={() => onActiveWorldChange(null)}
        onPointerEnter={() => onActiveWorldChange(id)}
        onPointerLeave={() => onActiveWorldChange(null)}
        onClick={() => onSelect(world.id)}
      >
        <span>{world.name}</span>
        <small>{locked ? "Coming soon" : id === "math" ? "Maths · enter" : "Discover and experiment"}</small>
      </button>;
      })}
    </div>
    <p id="world-lock-status" className={styles.status} role="status" aria-live="polite">{statusMessage}</p>
  </section>;
}
