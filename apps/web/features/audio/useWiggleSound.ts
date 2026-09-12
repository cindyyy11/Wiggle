"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Wiggle's sound design: gentle, synthesized tones (no audio files, no loud alarms,
 * no casino-style reward jingles). A wrong answer never gets a buzzer — only "let's
 * try again" gets a soft, slightly falling tone. Everything can be muted; the
 * preference is remembered per browser only (no server round trip, no account data).
 */
export type WiggleSoundName =
  | "missionStart"
  | "correct"
  | "tryAgain"
  | "whoosh"
  | "slideWhoosh"
  | "constellationUnlock"
  | "celebrate"
  | "magnetPull"
  | "magnetStay";

const MUTE_KEY = "wiggle:muted";

function tone(context: AudioContext, { frequency, start, duration, gain = 0.09, type = "sine" as OscillatorType }: {
  frequency: number; start: number; duration: number; gain?: number; type?: OscillatorType;
}) {
  const oscillator = context.createOscillator();
  const envelope = context.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, context.currentTime + start);
  envelope.gain.setValueAtTime(0, context.currentTime + start);
  envelope.gain.linearRampToValueAtTime(gain, context.currentTime + start + 0.02);
  envelope.gain.exponentialRampToValueAtTime(0.001, context.currentTime + start + duration);
  oscillator.connect(envelope).connect(context.destination);
  oscillator.start(context.currentTime + start);
  oscillator.stop(context.currentTime + start + duration + 0.05);
}

function playWhoosh(context: AudioContext, peakGain = 0.05) {
  const bufferSize = context.sampleRate * 0.4;
  const buffer = context.createBuffer(1, bufferSize, context.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
  const source = context.createBufferSource();
  source.buffer = buffer;
  const filter = context.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.setValueAtTime(600, context.currentTime);
  filter.frequency.exponentialRampToValueAtTime(1800, context.currentTime + 0.35);
  const gain = context.createGain();
  gain.gain.setValueAtTime(peakGain, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.4);
  source.connect(filter).connect(gain).connect(context.destination);
  source.start();
}

/** Clear magnetic buzz for metal that sticks — louder “zzzz”, still not an alarm. */
function playMagnetPull(context: AudioContext) {
  const now = context.currentTime;
  for (const [frequency, start, duration, gain] of [
    [180, 0, 0.42, 0.2],
    [260, 0.04, 0.44, 0.18],
    [360, 0.08, 0.38, 0.16],
    [480, 0.12, 0.32, 0.12],
  ] as const) {
    tone(context, { frequency, start, duration, gain, type: "triangle" });
  }
  const oscillator = context.createOscillator();
  const envelope = context.createGain();
  oscillator.type = "sawtooth";
  oscillator.frequency.setValueAtTime(120, now);
  oscillator.frequency.linearRampToValueAtTime(220, now + 0.35);
  envelope.gain.setValueAtTime(0, now);
  envelope.gain.linearRampToValueAtTime(0.14, now + 0.03);
  envelope.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
  oscillator.connect(envelope).connect(context.destination);
  oscillator.start(now);
  oscillator.stop(now + 0.6);
}

/** Clear “thud / stay put” for non-magnetic objects — brighter so laptop speakers hear it. */
function playMagnetStay(context: AudioContext) {
  tone(context, { frequency: 320, start: 0, duration: 0.24, gain: 0.2, type: "sine" });
  tone(context, { frequency: 240, start: 0.07, duration: 0.3, gain: 0.18, type: "triangle" });
  tone(context, { frequency: 180, start: 0.14, duration: 0.28, gain: 0.14, type: "sine" });
  tone(context, { frequency: 140, start: 0.2, duration: 0.22, gain: 0.1, type: "triangle" });
}

const SEQUENCES: Readonly<Record<Exclude<WiggleSoundName, "whoosh" | "slideWhoosh" | "magnetPull" | "magnetStay">, (context: AudioContext) => void>> = {
  missionStart: context => { tone(context, { frequency: 440, start: 0, duration: 0.22 }); tone(context, { frequency: 660, start: 0.08, duration: 0.24 }); },
  correct: context => { [523, 659, 784].forEach((frequency, index) => tone(context, { frequency, start: index * 0.07, duration: 0.2, gain: 0.07 })); },
  tryAgain: context => tone(context, { frequency: 330, start: 0, duration: 0.32, gain: 0.06, type: "sine" }),
  constellationUnlock: context => { [523, 659, 784, 988].forEach((frequency, index) => tone(context, { frequency, start: index * 0.09, duration: 0.35, gain: 0.06 })); },
  celebrate: context => { [392, 523, 659, 784, 1046].forEach((frequency, index) => tone(context, { frequency, start: index * 0.06, duration: 0.4, gain: 0.06 })); },
};

export function useWiggleSound() {
  const context = useRef<AudioContext | null>(null);
  const [muted, setMutedState] = useState(() => {
    if (typeof window === "undefined") return false;
    try { return window.localStorage.getItem(MUTE_KEY) === "1"; } catch { return false; }
  });

  useEffect(() => () => { void context.current?.close(); }, []);

  const setMuted = useCallback((value: boolean) => {
    setMutedState(value);
    try { window.localStorage.setItem(MUTE_KEY, value ? "1" : "0"); } catch { /* per-viewer preference only */ }
  }, []);

  const unlock = useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      context.current ??= new AudioContext();
      if (context.current.state === "suspended") void context.current.resume();
    } catch { /* Audio unlock is best-effort. */ }
  }, []);

  const play = useCallback((name: WiggleSoundName) => {
    if (muted || typeof window === "undefined") return;
    try {
      context.current ??= new AudioContext();
      if (context.current.state === "suspended") void context.current.resume();
      if (name === "whoosh") playWhoosh(context.current);
      else if (name === "slideWhoosh") playWhoosh(context.current, 0.14);
      else if (name === "magnetPull") playMagnetPull(context.current);
      else if (name === "magnetStay") playMagnetStay(context.current);
      else SEQUENCES[name](context.current);
    } catch { /* Sound is a nice-to-have, never a requirement to proceed. */ }
  }, [muted]);

  return { play, unlock, muted, setMuted };
}
