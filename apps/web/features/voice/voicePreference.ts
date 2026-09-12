/** Shared, per-browser mute preference for Lexi's spoken voice (Part 15's mute control). */
const VOICE_MUTE_KEY = "wiggle:voice-muted";

export function isVoiceMuted(): boolean {
  try { return window.localStorage.getItem(VOICE_MUTE_KEY) === "1"; } catch { return false; }
}

export function setVoiceMuted(muted: boolean): void {
  try { window.localStorage.setItem(VOICE_MUTE_KEY, muted ? "1" : "0"); } catch { /* per-viewer preference only */ }
}

/** Speaks text aloud unless the child has muted Lexi's voice or speech is unsupported. */
export function speakIfUnmuted(text: string): void {
  if (isVoiceMuted() || typeof window === "undefined" || !("speechSynthesis" in window)) return;
  try {
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(new SpeechSynthesisUtterance(text));
  } catch { /* Spoken audio is a nice-to-have; captions still carry the message. */ }
}
