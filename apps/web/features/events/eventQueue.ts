import { validateLearningEvent, type LearningEvent } from "@wiggle/contracts";
import { ApiError, type ApiClient } from "../../lib/api/client";

export const EVENT_QUEUE_KEY = "wiggle.learning-events.v1";
export const EVENT_BATCH_SIZE = 25;
export const MAX_RETRY_DELAY = 60000;
const MAX_BATCHES_PER_DRAIN = 4;
export interface QueuedEvent { event: LearningEvent; transport: "local" | "api"; attempts?: number; retryAt?: number; quarantined?: number }
interface StoredQueue { version: 1; entries: QueuedEvent[] }
type StoragePort = Pick<Storage, "getItem" | "setItem">;

/** Sessions drain independently; rejected evidence is quarantined, never erased. */
export class EventQueue {
  private pending: QueuedEvent[] = [];
  private storage?: StoragePort;
  private flights = new Map<string, Promise<void>>();
  constructor(storage?: StoragePort, private now: () => number = Date.now) {
    try { this.storage = storage ?? (typeof window !== "undefined" ? window.localStorage : undefined); } catch { /* Memory fallback. */ }
    try {
      const saved: unknown = JSON.parse(this.storage?.getItem(EVENT_QUEUE_KEY) || "null");
      if (saved && typeof saved === "object" && "version" in saved && saved.version === 1 && "entries" in saved && Array.isArray(saved.entries)) {
        this.pending = saved.entries.flatMap((entry: unknown) => {
          try {
            if (!entry || typeof entry !== "object" || !("transport" in entry) || !("event" in entry) || !["local", "api"].includes(String(entry.transport))) return [];
            const metadata = entry as { attempts?: unknown; retryAt?: unknown; quarantined?: unknown };
            return [{ event: validateLearningEvent(entry.event), transport: entry.transport as QueuedEvent["transport"],
              attempts: typeof metadata.attempts === "number" && Number.isFinite(metadata.attempts) ? Math.max(0, Math.min(16, Math.floor(metadata.attempts))) : 0,
              retryAt: typeof metadata.retryAt === "number" && Number.isFinite(metadata.retryAt) ? Math.min(metadata.retryAt, this.now() + MAX_RETRY_DELAY) : 0,
              quarantined: typeof metadata.quarantined === "number" && metadata.quarantined >= 400 && metadata.quarantined < 500 ? metadata.quarantined : undefined }];
          } catch { return []; }
        });
      }
    } catch { /* Invalid storage must not stop play. */ }
  }
  entries(): readonly QueuedEvent[] { return this.pending.map(entry => ({ ...entry })); }
  enqueue(event: LearningEvent, transport: QueuedEvent["transport"]) {
    validateLearningEvent(event);
    if (!this.pending.some(entry => entry.event.id === event.id)) {
      const previous = this.pending.find(entry => entry.event.sessionId === event.sessionId);
      this.pending.push({ event, transport, attempts: previous?.attempts, retryAt: previous?.retryAt, quarantined: previous?.quarantined });
    }
    const locals = this.pending.filter(entry => entry.transport === "local");
    if (locals.length > 300) {
      const expired = new Set(locals.slice(0, locals.length - 300).map(entry => entry.event.id));
      this.pending = this.pending.filter(entry => !expired.has(entry.event.id));
    }
    this.save();
  }
  private save() {
    try { this.storage?.setItem(EVENT_QUEUE_KEY, JSON.stringify({ version: 1, entries: this.pending } satisfies StoredQueue)); } catch { /* Retain memory queue. */ }
  }
  nextRetryDelay() {
    const eligible = this.pending.filter(entry => entry.transport === "api" && !entry.quarantined);
    return eligible.length ? Math.max(1000, Math.min(MAX_RETRY_DELAY, ...eligible.map(entry => (entry.retryAt ?? 0) - this.now()))) : MAX_RETRY_DELAY;
  }
  /** Explicit session drains preserve event-before-adaptation ordering. Background
   * failures never prevent other sessions from draining. Each drain is bounded. */
  flush(client: ApiClient, signal: AbortSignal, sessionId?: string): Promise<void> {
    if (sessionId) return this.flushSession(client, signal, sessionId);
    const sessions = [...new Set(this.pending.filter(entry => entry.transport === "api" && !entry.quarantined && (entry.retryAt ?? 0) <= this.now()).map(entry => entry.event.sessionId))].slice(0, 4);
    return Promise.allSettled(sessions.map(id => this.flushSession(client, signal, id))).then(() => {});
  }
  private flushSession(client: ApiClient, signal: AbortSignal, sessionId: string): Promise<void> {
    const active = this.flights.get(sessionId);
    if (active) return active;
    const flight = this.deliver(client, signal, sessionId).finally(() => { this.flights.delete(sessionId); });
    this.flights.set(sessionId, flight);
    return flight;
  }
  private async deliver(client: ApiClient, signal: AbortSignal, sessionId: string) {
    for (let request = 0; request < MAX_BATCHES_PER_DRAIN; request++) {
      const entries = this.pending.filter(entry => entry.transport === "api" && entry.event.sessionId === sessionId);
      if (!entries.length) return;
      if (entries[0].quarantined) throw new ApiError(entries[0].quarantined);
      if ((entries[0].retryAt ?? 0) > this.now()) throw new Error("Event delivery is resting before retry");
      if (signal.aborted) throw new DOMException("Aborted", "AbortError");
      const completionIndex = entries.findIndex(entry => entry.event.type === "mission_completed");
      const batch = entries.slice(0, completionIndex === 0 ? 1 : Math.min(EVENT_BATCH_SIZE, completionIndex < 0 ? entries.length : completionIndex));
      try {
        const first = batch[0].event;
        let acknowledged: readonly string[];
        if (first.type === "mission_completed") {
          await client.complete({ sessionId, correctness: first.payload.correctness }, first.id, signal);
          acknowledged = [first.id];
        } else {
          acknowledged = (await client.events({ events: batch.map(entry => entry.event) }, signal)).acceptedEventIds;
        }
        const sent = new Set(batch.map(entry => entry.event.id));
        const accepted = new Set(acknowledged.filter(id => sent.has(id)));
        this.pending = this.pending.filter(entry => !accepted.has(entry.event.id));
        this.save();
        if (accepted.size !== batch.length) throw new Error("Event not acknowledged");
      } catch (error) {
        if (signal.aborted) throw error;
        const attempts = Math.min(16, (entries[0].attempts ?? 0) + 1);
        const retryAt = this.now() + Math.min(MAX_RETRY_DELAY, 1000 * 2 ** (attempts - 1));
        this.pending = this.pending.map(entry => entry.event.sessionId === sessionId && entry.transport === "api" ? { ...entry, attempts, retryAt, quarantined: error instanceof ApiError && error.permanent ? error.status : undefined } : entry);
        this.save();
        throw error;
      }
    }
    if (this.pending.some(entry => entry.transport === "api" && entry.event.sessionId === sessionId)) throw new Error("More evidence is queued for the next bounded drain");
  }
}
