import styles from "../mission/mission.module.css";

/** Accessible counterpart of the beacon already rendered in the 3D world. */
export function LexiBeacon({ onSummon }: { onSummon(): void }) {
  return <button className={styles.lexiBeacon} onClick={onSummon}><span aria-hidden="true">✧</span> Ask Lexi</button>;
}
