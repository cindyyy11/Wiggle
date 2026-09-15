"use client";

import { useState } from "react";
import { useLexiVoice } from "../../features/voice/useLexiVoice";
import { speakIfUnmuted } from "../../features/voice/voicePreference";
import styles from "./twinCheckIn.module.css";

type Mood = "great" | "okay" | "tricky";

const MOOD_LABELS: Readonly<Record<Mood, string>> = { great: "😊 Great", okay: "😐 Okay", tricky: "😣 Tricky" };

/** Warm, twin-voice replies — never a score, never saved as a learning signal (see module doc below). */
const MOOD_REPLIES: Readonly<Record<Mood, string>> = {
  great: "Yay! Let's keep that going!",
  okay: "Okay is a good place to be. One small step at a time.",
  tricky: "Thanks for telling me. Let's find something gentler together.",
};

function moodFromTranscript(transcript: string): Mood {
  const text = transcript.toLowerCase();
  if (/tired|hard|tricky|stuck|sad|frustrat|difficult|bad/.test(text)) return "tricky";
  if (/good|great|fun|happy|easy|awesome|love|amazing/.test(text)) return "great";
  return "okay";
}

/**
 * A small, two-way "how are you feeling?" check-in for the child's own Twin screen —
 * tap or talk. This is deliberately a private, in-the-moment chat, not a new
 * learning signal: the authoritative Twin state only ever comes from the backend's
 * own mastery/friction math (see packages/contracts/src/twinVisualState.ts), so
 * this never writes anywhere and never claims to change how the Twin looks. It
 * exists so the child feels heard, using the same mic/speech plumbing as Lexi's
 * in-mission voice (useLexiVoice) without needing an active mission session.
 */
export function TwinCheckIn() {
  const [mood, setMood] = useState<Mood | null>(null);
  const choose = (next: Mood) => { setMood(next); speakIfUnmuted(MOOD_REPLIES[next]); };
  const voice = useLexiVoice({ onResult: transcript => choose(moodFromTranscript(transcript)) });

  return <section className={styles.checkIn} aria-label="How are you feeling?">
    <p className={styles.prompt}>How are you feeling about missions today?</p>
    <div className={styles.moods}>
      {(Object.keys(MOOD_LABELS) as Mood[]).map(key => (
        <button key={key} type="button" aria-pressed={mood === key} onClick={() => choose(key)}>{MOOD_LABELS[key]}</button>
      ))}
      {voice.supported && <button
        type="button"
        aria-pressed={voice.phase === "listening"}
        onClick={() => (voice.phase === "listening" ? voice.stop() : voice.start())}
      >
        {voice.phase === "listening" ? "Listening… tap to stop" : "🎤 Or tell me"}
      </button>}
    </div>
    {mood ? <p role="status" className={styles.response}>{MOOD_REPLIES[mood]}</p> : null}
  </section>;
}
