"use client";
import { SUBJECT_WORLDS, type SubjectWorldId } from "./subjectRoute";
import styles from "./SubjectWorlds.module.css";

export type WorldSelectorProps = {
  activeWorld: SubjectWorldId | null;
  onActiveWorldChange: (world: SubjectWorldId | null) => void;
  selectedWorld?: SubjectWorldId;
  onChoose?: (world: SubjectWorldId) => void;
  onSlide?: (direction: number) => void;
  onSelect: (world: SubjectWorldId) => void;
  statusMessage: string;
};
const order = ["math", "science", "bm", "english"] as const;
export function WorldSelector({ selectedWorld = "math", onChoose, onSlide, onSelect, statusMessage }: WorldSelectorProps) {
  const world = SUBJECT_WORLDS.find(item => item.id === selectedWorld)!;
  const locked = world.status === "coming-soon";
  return <section className={`${styles.selector} ${styles.carouselSelector}`} aria-label="Choose a subject world">
    <header className={styles.carouselHeader}><img src="/brand/wiggle-mark.png" alt="Wiggle" /><span>Wiggle. Wonder. Wow!</span></header>
    <p className={styles.carouselHint}>A whole world of discovery.<br /><span>Slide to find your next adventure</span></p>
    <button className={`${styles.carouselArrow} ${styles.arrowPrevious}`} aria-label="Previous planet" disabled={selectedWorld === "math"} onClick={() => onSlide?.(-1)}>←</button>
    <button className={`${styles.carouselArrow} ${styles.arrowNext}`} aria-label="Next planet" disabled={selectedWorld === "english"} onClick={() => onSlide?.(1)}>→</button>
    <div className={styles.carouselCaption}>
      <p>{selectedWorld === "math" ? "THE MATHS PLANET" : selectedWorld === "science" ? "THE SCIENCE PLANET" : "A NEW WORLD IS GROWING"}</p>
      <h1>{world.name}</h1>
      <span>{locked ? "More adventures are on their way." : selectedWorld === "math" ? "Little steps. Big discoveries. Your adventure starts here." : "Explore, experiment, and discover how the world works."}</span>
      <button className={styles.carouselEnter} aria-label={locked ? `${world.name} (coming soon)` : `Explore ${world.name}`} aria-describedby={locked ? "world-lock-status" : undefined} onClick={() => onSelect(selectedWorld)}>{locked ? "🔒 Coming soon" : `Explore ${selectedWorld === "math" ? "Numeria" : "Science Planet"} ↗`}</button>
      <div className={styles.subjectTabs} role="group" aria-label="Choose a planet">
        {order.map(id => <button key={id} aria-label={`Show ${id === "math" ? "Numeria" : id === "science" ? "Science Planet" : id === "bm" ? "Bahasa Melayu" : "English"}`} aria-pressed={selectedWorld === id} onClick={() => onChoose?.(id)}>{id === "math" ? "Maths" : id === "science" ? "Science" : id === "bm" ? "BM · 🔒" : "English · 🔒"}</button>)}
      </div>
    </div>
    <p id="world-lock-status" className={styles.status} role="status" aria-live="polite" aria-atomic="true">{statusMessage}</p>
  </section>;
}
