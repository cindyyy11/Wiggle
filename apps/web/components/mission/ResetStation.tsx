import { useEffect, useRef } from "react";
import styles from "./mission.module.css";
export function ResetStation({ onComplete, onCancel }: { onComplete(): void; onCancel(): void }) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus(); }, []);
  return <section className={styles.support} aria-label="Learning reset" onKeyDown={event => { if (event.key === "Escape") onCancel(); }}>
    <h2 ref={heading} tabIndex={-1}>Reset Station</h2>
    <div className={styles.breath} aria-hidden="true">✳</div>
    <p>A learning reset, at your own pace. Take an easy breath. Let your shoulders relax, stretch if you like, and look at something far away.</p>
    <button className={styles.primary} onClick={onComplete}>I&apos;m ready to return</button>
    <button className={styles.quiet} onClick={onCancel}>Back without finishing</button>
  </section>;
}
