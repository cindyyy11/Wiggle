import { validateLearningEvent, type LearningEvent } from "@wiggle/contracts";
import type { ApiClient } from "../../lib/api/client";

export const EVENT_QUEUE_KEY = "wiggle.learning-events.v1";
export interface QueuedEvent { event: LearningEvent; transport: "local" | "api" }
interface StoredQueue { version: 1; entries: QueuedEvent[] }
type StoragePort = Pick<Storage, "getItem" | "setItem">;

/** Local demonstrations stay on-device. API events are acknowledged in order, with
 * the completion envelope delivered only through the authoritative endpoint. */
export class EventQueue {
  private pending: QueuedEvent[] = [];
  private storage?: StoragePort;
  private flushing: Promise<void> | null = null;
  constructor(storage?: StoragePort) {
    try { this.storage = storage ?? (typeof window !== "undefined" ? window.localStorage : undefined); } catch { /* Restricted storage: memory queue remains usable. */ }
    try {
      const saved: unknown = JSON.parse(this.storage?.getItem(EVENT_QUEUE_KEY) || "null");
      if (saved && typeof saved === "object" && "version" in saved && saved.version === 1 && "entries" in saved && Array.isArray(saved.entries)) {
        this.pending = saved.entries.flatMap((entry: unknown) => {
          try {
            if (!entry || typeof entry !== "object" || !("transport" in entry) || !("event" in entry) || !["local", "api"].includes(String(entry.transport))) return [];
            return [{ event: validateLearningEvent(entry.event), transport: entry.transport as QueuedEvent["transport"] }];
          } catch { return []; }
        });
      }
    } catch { /* Corrupt or older data must not stop a mission. */ }
  }
  entries(): readonly QueuedEvent[] { return [...this.pending]; }
  enqueue(event: LearningEvent, transport: QueuedEvent["transport"]) {
    validateLearningEvent(event);
    if (!this.pending.some(entry => entry.event.id === event.id)) this.pending.push({ event, transport });
    // Bound the local demo journal; never evict an unsent API event.
    const locals = this.pending.filter(entry => entry.transport === "local");
    if (locals.length > 300) {
      const expired = new Set(locals.slice(0, locals.length - 300).map(entry => entry.event.id));
      this.pending = this.pending.filter(entry => !expired.has(entry.event.id));
    }
    this.save();
  }
  private save() {
    try { this.storage?.setItem(EVENT_QUEUE_KEY, JSON.stringify({ version: 1, entries: this.pending } satisfies StoredQueue)); } catch { /* Quota/security failure: retain the in-memory queue. */ }
  }
  flush(client: ApiClient, signal: AbortSignal): Promise<void> {
    if (this.flushing) return this.flushing;
    this.flushing = this.deliver(client, signal).finally(() => { this.flushing = null; });
    return this.flushing;
  }
  private async deliver(client: ApiClient, signal: AbortSignal) {
    let next: QueuedEvent | undefined;
    while ((next = this.pending.find(entry => entry.transport === "api"))) {
      const { event } = next;
      if (signal.aborted) throw new DOMException("Aborted", "AbortError");
      if (event.type === "mission_completed") {
        await client.complete({ sessionId: event.sessionId, correctness: event.payload.correctness }, event.id, signal);
      } else {
        const response = await client.events({ events: [event] }, signal);
        if (!response.acceptedEventIds.includes(event.id)) throw new Error("Event not acknowledged");
      }
      this.pending = this.pending.filter(entry => entry.event.id !== event.id);
      this.save();
    }
  }
}
