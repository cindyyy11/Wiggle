import { MUTE_KEY, tone } from "./useWiggleSound";

const PLAYED_KEY = "wiggle:splash-chime-played";
const NOTES = [523, 659, 784, 1046];

function isReload(): boolean {
  try {
    const [entry] = performance.getEntriesByType("navigation") as PerformanceNavigationTiming[];
    return entry?.type === "reload";
  } catch { return false; }
}

/**
 * Plays the welcome chime once per browser session (a new tab or a fresh launch),
 * never on a refresh: sessionStorage survives reloads but not new tabs/windows.
 * Best-effort — browsers may keep audio blocked until the first tap.
 */
export function playSplashChimeOnce(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (window.sessionStorage.getItem(PLAYED_KEY) === "1") return false;
    window.sessionStorage.setItem(PLAYED_KEY, "1");
  } catch { /* Storage blocked: fall back to the reload check alone. */ }
  if (isReload()) return false;
  try { if (window.localStorage.getItem(MUTE_KEY) === "1") return false; } catch { /* Not muted by default. */ }
  try {
    const context = new AudioContext();
    if (context.state === "suspended") void context.resume().catch(() => undefined);
    NOTES.forEach((frequency, index) => tone(context, { frequency, start: index * 0.1, duration: 0.7, gain: 0.06 }));
    window.setTimeout(() => void context.close().catch(() => undefined), 1500);
    return true;
  } catch { return false; }
}
