"use client";
import { SUBJECT_WORLD_ORDER, SUBJECT_WORLDS, type SubjectWorldId } from "./subjectRoute";
import styles from "./SubjectWorlds.module.css";

export type WorldSelectorProps = {
  activeWorld: SubjectWorldId | null;
  onActiveWorldChange: (world: SubjectWorldId | null) => void;
  selectedWorld?: SubjectWorldId;
  onSlide?: (direction: number) => void;
  onSelect: (world: SubjectWorldId) => void;
  statusMessage: string;
};
export function WorldSelector({ selectedWorld = "math", onSlide, onSelect, statusMessage }: WorldSelectorProps) {
  const world = SUBJECT_WORLDS.find(item => item.id === selectedWorld)!;
  const locked = world.status === "coming-soon";
  return <section className={`${styles.selector} ${styles.carouselSelector}`} aria-label="Choose a subject world">
    <header className={styles.carouselHeader}><img src="/brand/wiggle-wordmark.png" alt="Wiggle" /><span>Wonder. Wow!</span></header>
    <p className={styles.carouselHint}>A whole world of discovery.<br /><span>Slide to find your next adventure</span></p>
    <button className={`${styles.carouselArrow} ${styles.arrowPrevious}`} aria-label="Previous planet" disabled={selectedWorld === SUBJECT_WORLD_ORDER[0]} onClick={() => onSlide?.(-1)}>←</button>
    <button className={`${styles.carouselArrow} ${styles.arrowNext}`} aria-label="Next planet" disabled={selectedWorld === SUBJECT_WORLD_ORDER[SUBJECT_WORLD_ORDER.length - 1]} onClick={() => onSlide?.(1)}>→</button>
    <div className={styles.carouselCaption} data-mystery={world.mystery || undefined}>
      <p>{selectedWorld === "math" ? "THE MATHS PLANET" : selectedWorld === "science" ? "THE SCIENCE PLANET" : "A NEW WORLD IS GROWING"}</p>
      <h1>{world.name}</h1>
      <span>{locked ? "More adventures are on their way." : selectedWorld === "math" ? "Little steps. Big discoveries. Your adventure starts here." : "Explore, experiment, and discover how the world works."}</span>
      <button className={styles.carouselEnter} aria-label={locked ? `${world.name} (coming soon)` : `Explore ${world.name}`} aria-describedby={locked ? "world-lock-status" : undefined} onClick={() => onSelect(selectedWorld)}>
        <span>{locked ? "Coming soon" : `Explore ${selectedWorld === "math" ? "Numeria" : "Science Planet"}`}</span>
        <span aria-hidden="true">{locked ? "🔒" : "↗"}</span>
      </button>
    </div>
    <p id="world-lock-status" className={styles.status} role="status" aria-live="polite" aria-atomic="true">{statusMessage}</p>
  </section>;
}
