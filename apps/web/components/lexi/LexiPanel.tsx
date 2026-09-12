import { useEffect, useRef, useState } from "react";
import type { LexiRequest, TwinVisualState } from "@wiggle/contracts";
import { WiggleTwinAvatar } from "../wiggle/WiggleTwinAvatar";
import { useLexiVoice } from "../../features/voice/useLexiVoice";
import { isVoiceMuted, setVoiceMuted } from "../../features/voice/voicePreference";
import styles from "../mission/mission.module.css";

export type LexiAction = Omit<LexiRequest, "sessionId">;

export function LexiPanel({ text, busy, twinState = "ready", onRequest, onClose }: {
  text: string; busy: boolean; twinState?: TwinVisualState; onRequest(action: LexiAction): void; onClose(): void;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  const lastSpoken = useRef("");
  const voice = useLexiVoice({ onResult: transcript => onRequest({ message: transcript }) });
  const [muted, setMuted] = useState(isVoiceMuted);
  useEffect(() => { heading.current?.focus(); return () => window.speechSynthesis?.cancel(); }, []);
  // Speak every new line Lexi says (Part 15): hints, mode switches, and free replies alike -
  // unless the child has muted Lexi's voice, in which case captions alone still show.
  // `voice.speak` intentionally is not a dependency — it is stable in practice and including
  // it would re-run this effect on every render since useLexiVoice recreates its callbacks.
  useEffect(() => {
    if (text && text !== lastSpoken.current && !busy) {
      lastSpoken.current = text;
      if (!muted) voice.speak(text);
    }
  }, [text, busy, muted]);
  const toggleMuted = () => {
    const next = !muted;
    setMuted(next);
    if (next) window.speechSynthesis?.cancel();
    setVoiceMuted(next);
  };
  return <section aria-label="Lexi learning companion" className={styles.support} onKeyDown={event => { if (event.key === "Escape") onClose(); }}>
    <h2 ref={heading} tabIndex={-1}>A little help from Lexi</h2>
    <WiggleTwinAvatar state={twinState} size={96} listening={voice.phase === "listening"} speaking={voice.phase === "speaking"} />
    <p role="status" aria-label="Lexi">{busy ? "Lexi is thinking…" : text || "One small step is a good place to start."}</p>
    <fieldset disabled={busy} className={styles.supportActions}>
      {voice.supported && <button aria-pressed={voice.phase === "listening"} onClick={() => (voice.phase === "listening" ? voice.stop() : voice.start())}>{voice.phase === "listening" ? "Listening… tap to stop" : "🎤 Talk to Lexi"}</button>}
      <button aria-pressed={muted} onClick={toggleMuted}>{muted ? "🔇 Lexi's voice is off" : "🔈 Lexi's voice is on"}</button>
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
