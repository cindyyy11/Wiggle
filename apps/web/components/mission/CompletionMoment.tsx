import { WIGGLE_REWARD } from "../../lib/demo/seed";
import styles from "./mission.module.css";

export function CompletionMoment({ correctness, onReturn }: { correctness: number; onReturn: () => void }) {
  return <div className={styles.completion}><span className={styles.rewardStar} aria-hidden="true">✳</span><span className={styles.kicker}>MISSION COMPLETE</span><h2>You made three quarters!</h2><p>A little exploring helped it click.</p><strong className={styles.score}>{Math.round(correctness * 100)}%</strong><span className={styles.scoreLabel}>Mission result</span><p className={styles.reward}>+{WIGGLE_REWARD} Wiggle Energy</p><button className={styles.primary} onClick={onReturn}>Back to my universe <span aria-hidden="true">↗</span></button></div>;
}
