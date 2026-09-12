import { useEffect, useRef, useState } from "react";
import { AMBIENT_TRACKS, useAmbientSound } from "../../features/audio/useAmbientSound";
import styles from "./mission.module.css";

const BREATH_PHASES: readonly { text: string; ms: number }[] = [
  { text: "Breathe in slowly.", ms: 4000 },
  { text: "Hold.", ms: 2000 },
  { text: "Breathe out.", ms: 4000 },
];

/** A short, self-paced breathing/stretch break (Part 17). This is not therapy. */
export function ResetStation({ onComplete, onCancel }: { onComplete(): void; onCancel(): void }) {
  const heading = useRef<HTMLHeadingElement>(null);
  const [phase, setPhase] = useState(0);
  const ambient = useAmbientSound();
  useEffect(() => { heading.current?.focus(); }, []);
  useEffect(() => {
    const timer = window.setTimeout(() => setPhase(current => (current + 1) % BREATH_PHASES.length), BREATH_PHASES[phase].ms);
    return () => window.clearTimeout(timer);
  }, [phase]);
  return <section className={styles.support} aria-label="Learning reset" onKeyDown={event => { if (event.key === "Escape") onCancel(); }}>
    <h2 ref={heading} tabIndex={-1}>Reset Station</h2>
    <div className={styles.breath} aria-hidden="true">✳</div>
    <p role="status" aria-live="polite" className={styles.breathText}>{BREATH_PHASES[phase].text}</p>
    <p>A learning reset, at your own pace. Take an easy breath. Let your shoulders relax, stretch if you like, and look at something far away.</p>
    <fieldset className={styles.ambient}>
      <legend>Sound</legend>
      {AMBIENT_TRACKS.map(option => (
        <button key={option.id} type="button" aria-pressed={ambient.track === option.id} onClick={() => ambient.setTrack(option.id)}>{option.label}</button>
      ))}
    </fieldset>
    <button className={styles.primary} onClick={onComplete}>I&apos;m ready to return</button>
    <button className={styles.quiet} onClick={onCancel}>Back without finishing</button>
  </section>;
}
