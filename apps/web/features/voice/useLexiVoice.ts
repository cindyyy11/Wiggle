"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Push-to-talk voice I/O for Lexi, built entirely on browser APIs (Web Speech API
 * for both directions) so it needs no server voice credentials to demo. The
 * interface is intentionally narrow enough to swap in a realtime model (e.g. a
 * Gemini Live session) later without changing any caller: `start`/`stop` capture
 * one utterance and report it through `onResult`; `speak` plays one reply aloud.
 *
 * Privacy: this never opens a continuous/always-on microphone (Part 13 of the
 * spec) and never records or uploads audio — the browser's own recognizer turns
 * speech into text locally-to-the-tab, and only the resulting text ever leaves it.
 */
export type LexiVoicePhase = "idle" | "listening" | "speaking";

interface SpeechRecognitionLike extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const scoped = window as unknown as { SpeechRecognition?: SpeechRecognitionCtor; webkitSpeechRecognition?: SpeechRecognitionCtor };
  return scoped.SpeechRecognition ?? scoped.webkitSpeechRecognition ?? null;
}

export interface UseLexiVoiceOptions {
  onResult(transcript: string): void;
  lang?: string;
}

export function useLexiVoice({ onResult, lang = "en-US" }: UseLexiVoiceOptions) {
  const [phase, setPhase] = useState<LexiVoicePhase>("idle");
  const [caption, setCaption] = useState("");
  const recognition = useRef<SpeechRecognitionLike | null>(null);
  const supported = typeof window !== "undefined" && getRecognitionCtor() !== null;
  const speechSupported = typeof window !== "undefined" && "speechSynthesis" in window;

  useEffect(() => () => { recognition.current?.abort(); window.speechSynthesis?.cancel(); }, []);

  const start = useCallback(() => {
    const Ctor = getRecognitionCtor();
    if (!Ctor || phase !== "idle") return;
    window.speechSynthesis?.cancel();
    const instance = new Ctor();
    instance.continuous = false;
    instance.interimResults = false;
    instance.lang = lang;
    instance.onresult = event => {
      const transcript = event.results[0]?.[0]?.transcript ?? "";
      if (transcript) onResult(transcript);
    };
    instance.onerror = () => setPhase("idle");
    instance.onend = () => setPhase(current => (current === "listening" ? "idle" : current));
    recognition.current = instance;
    setPhase("listening");
    instance.start();
  }, [lang, onResult, phase]);

  const stop = useCallback(() => {
    recognition.current?.stop();
    setPhase("idle");
  }, []);

  const speak = useCallback((text: string) => {
    setCaption(text);
    if (!speechSupported) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.onstart = () => setPhase("speaking");
    utterance.onend = () => setPhase(current => (current === "speaking" ? "idle" : current));
    utterance.onerror = () => setPhase(current => (current === "speaking" ? "idle" : current));
    window.speechSynthesis.speak(utterance);
  }, [speechSupported]);

  return { phase, caption, start, stop, speak, supported, speechSupported };
}
