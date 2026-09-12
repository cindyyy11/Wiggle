/**
 * Live sync between a child's mission and the parent dashboard (Part 19). Uses the
 * browser's native BroadcastChannel so a meaningful moment - a completed mission -
 * reaches an already-open parent dashboard tab immediately, with zero extra infra.
 * This is a same-browser convenience only; the API/database remains the durable,
 * cross-device source of truth the parent dashboard also refetches from.
 */
const CHANNEL_NAME = "wiggle-live";

export interface WiggleLiveEvent {
  type: "mission_completed";
  childId: string;
  missionTitle: string;
  occurredAt: string;
}

export function publishWiggleLiveEvent(event: WiggleLiveEvent): void {
  try {
    const channel = new BroadcastChannel(CHANNEL_NAME);
    channel.postMessage(event);
    channel.close();
  } catch { /* Live sync is a nice-to-have; the API remains the source of truth. */ }
}

/** Returns an unsubscribe function. Silently no-ops when BroadcastChannel is unavailable. */
export function subscribeWiggleLiveEvents(onEvent: (event: WiggleLiveEvent) => void): () => void {
  try {
    const channel = new BroadcastChannel(CHANNEL_NAME);
    channel.onmessage = message => onEvent(message.data as WiggleLiveEvent);
    return () => channel.close();
  } catch {
    return () => {};
  }
}
