import type { LearningMode } from "@wiggle/contracts";
import styles from "./mission.module.css";

export function PizzaActivity({ selectedSlices, mode, onCheck }: { selectedSlices: readonly number[]; mode: LearningMode; onCheck: () => void }) {
  return <><h2>Make three quarters</h2><p>{mode === "chunk" ? (selectedSlices.length < 3 ? `Choose ${selectedSlices.length === 0 ? "one slice" : "one more slice"}.` : "Now check your three slices.") : "Tap three of the four equal slices."}</p><p className={styles.sliceCount} aria-live="polite">{selectedSlices.length} of 4 slices selected</p><button className={styles.primary} onClick={onCheck}>Check my pizza <span aria-hidden="true">↗</span></button></>;
}
