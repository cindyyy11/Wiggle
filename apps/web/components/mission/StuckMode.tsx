import styles from "./mission.module.css";

export function StuckMode({ onExplore, onCheck, selectedSlices }: { onExplore: () => void; onCheck: () => void; selectedSlices: readonly number[] }) {
  return <><h2>Select three pizza slices</h2><p>Three pieces out of four make three quarters.</p><p className={styles.sliceCount} aria-live="polite">{selectedSlices.length} of 4 slices selected</p><button className={styles.primary} onClick={onCheck}>Check my pizza <span aria-hidden="true">↗</span></button><button className={styles.quiet} onClick={onExplore}>See my learning paths</button></>;
}
