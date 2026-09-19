import type { TwinVisualState } from "@wiggle/contracts";
import { ArrowUpRight, Sparkles } from "lucide-react";
import { WIGGLE_REWARD } from "../../lib/demo/seed";
import { WiggleTwinAvatar } from "../wiggle/WiggleTwinAvatar";
import styles from "./mission.module.css";

export function CompletionMoment({ correctness, onReturn, onReality, realityCompleted, twinState = "progressing", newStar }: {
  correctness: number; onReturn: () => void; onReality: () => void; realityCompleted: boolean;
  twinState?: TwinVisualState; newStar?: string | null;
}) {
  return <div className={styles.completion}>
    <WiggleTwinAvatar state={twinState} size={128} />
    <span className={styles.kicker}>MISSION COMPLETE</span><h2>You made three quarters!</h2><p>Lexi: “Nice exploring — you found three quarters!”</p><strong className={styles.score}>{Math.round(correctness * 100)}%</strong><span className={styles.scoreLabel}>Mission result</span><p className={styles.reward}>+{WIGGLE_REWARD} Wiggle Energy</p>
    {newStar ? <p className={styles.newStar} role="status"><Sparkles aria-hidden="true" size={18} /> New star unlocked: <strong>{newStar}</strong></p> : null}
    <button className={styles.primary} onClick={onReturn}>Back to my universe <ArrowUpRight aria-hidden="true" size={18} /></button>{realityCompleted ? <p>You found three quarters around you, too.</p> : <><p>Want to find three quarters around you? This little mission is optional.</p><button className={styles.quiet} onClick={onReality}>Try a Reality Mission</button></>}
  </div>;
}
