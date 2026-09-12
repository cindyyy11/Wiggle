import { WIGGLE_REWARD } from "../../lib/demo/seed";
import styles from "./mission.module.css";

export function CompletionMoment({ correctness, onReturn, onReality, realityCompleted }: { correctness: number; onReturn: () => void; onReality: () => void; realityCompleted: boolean }) {
  return <div className={styles.completion}><span className={styles.rewardStar} aria-hidden="true">✳</span><span className={styles.kicker}>MISSION COMPLETE</span><h2>You made three quarters!</h2><p>Lexi: “Nice exploring — you found three quarters!”</p><strong className={styles.score}>{Math.round(correctness * 100)}%</strong><span className={styles.scoreLabel}>Mission result</span><p className={styles.reward}>+{WIGGLE_REWARD} Wiggle Energy</p><button className={styles.primary} onClick={onReturn}>Back to my universe <span aria-hidden="true">↗</span></button>{realityCompleted ? <p>You found three quarters around you, too.</p> : <><p>Want to find three quarters around you? This little mission is optional.</p><button className={styles.quiet} onClick={onReality}>Try a Reality Mission</button></>}</div>;
}
