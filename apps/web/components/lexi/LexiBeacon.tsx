import { Sparkles } from "lucide-react";
import styles from "../mission/mission.module.css";

/** Accessible counterpart of the beacon already rendered in the 3D world. */
export function LexiBeacon({ onSummon }: { onSummon(): void }) {
  return <button className={styles.lexiBeacon} onClick={onSummon}><Sparkles aria-hidden="true" size={18} /> Ask Lexi</button>;
}
