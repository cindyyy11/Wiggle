import styles from "./mission.module.css";

export function StuckMode({ onExplore, onBack }: { onExplore: () => void; onBack: () => void }) {
  return <><span className={styles.kicker}>LEXI IS HERE</span><h2>Let's try another way</h2><p>Same little puzzle. A fresh way to see it.</p><button className={styles.primary} onClick={onExplore}>Find my way <span aria-hidden="true">✧</span></button><button className={styles.quiet} onClick={onBack}>Back to my puzzle</button></>;
}
