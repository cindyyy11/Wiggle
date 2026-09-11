import { useEffect, useRef } from "react";
import type { LexiRequest } from "@wiggle/contracts";
import styles from "../mission/mission.module.css";

export type LexiAction = Omit<LexiRequest, "sessionId">;
export function LexiPanel({ text, busy, onRequest, onClose }: { text: string; busy: boolean; onRequest(action: LexiAction): void; onClose(): void }) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus(); return () => window.speechSynthesis?.cancel(); }, []);
  return <section aria-label="Lexi learning companion" className={styles.support} onKeyDown={event => { if (event.key === "Escape") onClose(); }}>
    <h2 ref={heading} tabIndex={-1}>A little help from Lexi</h2>
    <p role="status">{busy ? "Lexi is thinking…" : text || "One small step is a good place to start."}</p>
    <fieldset disabled={busy} className={styles.supportActions}>
      <button onClick={() => onRequest({ tool: "request_hint" })}>Give me a hint</button>
      <button onClick={() => onRequest({ tool: "switch_learning_mode", mode: "chunk" })}>Try one tiny step</button>
      <button onClick={() => onRequest({ tool: "start_reset_station" })}>Take a learning reset</button>
      <button onClick={() => onRequest({ tool: "create_reality_mission" })}>Try a Reality Mission</button>
      <button onClick={() => onRequest({ tool: "record_self_report", difficulty: .8 })}>This feels tricky</button>
      <button onClick={() => { if (text && "speechSynthesis" in window) { window.speechSynthesis.cancel(); window.speechSynthesis.speak(new SpeechSynthesisUtterance(text)); } }}>Read Lexi&apos;s words aloud</button>
    </fieldset>
    <button className={styles.quiet} onClick={onClose}>Back to my puzzle</button>
  </section>;
}
