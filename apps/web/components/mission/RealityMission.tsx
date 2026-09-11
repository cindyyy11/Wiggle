import { useEffect, useRef } from "react";
import styles from "./mission.module.css";
export const REALITY_PROMPT = "Find four small objects. Put three in a group.";
export function RealityMission({ prompt, onComplete, onCancel }: { prompt: string; onComplete(): void; onCancel(): void }) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus(); }, []);
  return <section className={styles.support} aria-label="Reality Mission" onKeyDown={event => { if (event.key === "Escape") onCancel(); }}>
    <h2 ref={heading} tabIndex={-1}>A little mission around you</h2>
    <p>{prompt || REALITY_PROMPT}</p><p>Use objects you can safely reach, or draw four circles on paper. Your three make three quarters. No photo needed.</p>
    <button className={styles.primary} onClick={onComplete}>I found my three quarters</button>
    <button className={styles.quiet} onClick={onCancel}>Back without finishing</button>
  </section>;
}
