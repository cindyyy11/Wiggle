"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Reset Station's soft ambient soundscapes (Part 17). Everything is synthesized
 * with WebAudio at a low, constant volume - no audio files, and nothing louder or
 * more surprising than a hush. "Quiet" (the default) plays nothing at all.
 */
export type AmbientTrack = "quiet" | "calm" | "forest" | "rain" | "waves";
export const AMBIENT_TRACKS: readonly { id: AmbientTrack; label: string }[] = [
  { id: "quiet", label: "Quiet" },
  { id: "calm", label: "Calm Space" },
  { id: "forest", label: "Forest" },
  { id: "rain", label: "Rain" },
  { id: "waves", label: "Soft Waves" },
];

interface AmbientNodes { stop(): void }

function noiseBuffer(context: AudioContext, seconds = 4): AudioBuffer {
  const buffer = context.createBuffer(1, context.sampleRate * seconds, context.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
}

function noiseLoop(context: AudioContext, { frequency, q = 0.7, gain = 0.035 }: { frequency: number; q?: number; gain?: number }): AmbientNodes {
  const source = context.createBufferSource();
  source.buffer = noiseBuffer(context);
  source.loop = true;
  const filter = context.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = frequency;
  filter.Q.value = q;
  const level = context.createGain();
  level.gain.value = gain;
  source.connect(filter).connect(level).connect(context.destination);
  source.start();
  return { stop: () => { try { source.stop(); } catch { /* already stopped */ } source.disconnect(); filter.disconnect(); level.disconnect(); } };
}

function wavesLoop(context: AudioContext): AmbientNodes {
  const source = context.createBufferSource();
  source.buffer = noiseBuffer(context);
  source.loop = true;
  const filter = context.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = 500;
  filter.Q.value = 0.5;
  const level = context.createGain(); // modulated to sound like waves swelling and receding
  level.gain.value = 0.02;
  const lfo = context.createOscillator();
  lfo.frequency.value = 0.12; // one slow "wave" every ~8 seconds
  const lfoGain = context.createGain();
  lfoGain.gain.value = 0.018;
  lfo.connect(lfoGain).connect(level.gain);
  source.connect(filter).connect(level).connect(context.destination);
  source.start(); lfo.start();
  return {
    stop: () => {
      try { source.stop(); lfo.stop(); } catch { /* already stopped */ }
      source.disconnect(); filter.disconnect(); level.disconnect(); lfo.disconnect(); lfoGain.disconnect();
    },
  };
}

function calmPad(context: AudioContext): AmbientNodes {
  const level = context.createGain();
  level.gain.value = 0.025;
  level.connect(context.destination);
  const oscillators = [220, 220.6, 330].map(frequency => {
    const oscillator = context.createOscillator();
    oscillator.type = "sine";
    oscillator.frequency.value = frequency;
    oscillator.connect(level);
    oscillator.start();
    return oscillator;
  });
  return { stop: () => { oscillators.forEach(oscillator => { oscillator.stop(); oscillator.disconnect(); }); level.disconnect(); } };
}

function buildTrack(context: AudioContext, track: AmbientTrack): AmbientNodes | null {
  switch (track) {
    case "forest": return noiseLoop(context, { frequency: 2200, q: 0.9, gain: 0.02 });
    case "rain": return noiseLoop(context, { frequency: 3200, q: 0.4, gain: 0.03 });
    case "waves": return wavesLoop(context);
    case "calm": return calmPad(context);
    case "quiet": return null;
  }
}

export function useAmbientSound() {
  const context = useRef<AudioContext | null>(null);
  const nodes = useRef<AmbientNodes | null>(null);
  const [track, setTrackState] = useState<AmbientTrack>("quiet");

  const stop = useCallback(() => { nodes.current?.stop(); nodes.current = null; }, []);

  const setTrack = useCallback((next: AmbientTrack) => {
    stop();
    setTrackState(next);
    if (next === "quiet" || typeof window === "undefined") return;
    try {
      context.current ??= new AudioContext();
      if (context.current.state === "suspended") void context.current.resume();
      nodes.current = buildTrack(context.current, next);
    } catch { /* Ambient sound is optional; the reset still works without it. */ }
  }, [stop]);

  useEffect(() => () => { stop(); void context.current?.close(); }, [stop]);

  return { track, setTrack };
}
