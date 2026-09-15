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

// A negated positive ("not fun", "wasn't easy", "didn't like it") should read as
// tricky, not great — checked first so a plain keyword match can't be fooled by it.
const NEGATED_POSITIVE = /\b(not|isn'?t|wasn'?t|aren'?t|weren'?t|didn'?t|doesn'?t|don'?t|no)\b[^.!?]{0,20}\b(good|great|fun|happy|easy|awesome|love|amazing|like|enjoy)\b/;

function moodFromTranscript(transcript: string): Mood {
  const text = transcript.toLowerCase();
  if (NEGATED_POSITIVE.test(text)) return "tricky";
  if (/tired|hard|tricky|stuck|sad|frustrat(ed|ing)?|difficult|bad|boring|confus(ed|ing)|annoying|upset/.test(text)) return "tricky";
  if (/good|great|fun|happy|easy|awesome|love|amazing|nice|cool|yay/.test(text)) return "great";
  return "okay";
}

/**
 * A small, two-way "how are you feeling?" check-in for the child's own Twin screen —
 * tap or talk. This is deliberately a private, in-the-moment chat, not a new
 * learning signal: the authoritative Twin state only ever comes from the backend's
 * own mastery/friction math (see packages/contracts/src/twinVisualState.ts), so
 * this never writes anywhere and never claims to change how the Twin looks. It
 * exists so the child feels heard, using the same mic/speech plumbing as Lexi's
 * in-mission voice (useLexiVoice) without needing an active mission session. A
 * "Tricky" answer also offers a real, honest next step — a link back to the World
 * Selector to try something else — rather than a reply with nowhere to go.
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
    {mood === "tricky" ? <a className={styles.gentleLink} href="/">Let's try something else for now ↗</a> : null}
  </section>;
}
