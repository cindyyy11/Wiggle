// @vitest-environment jsdom
import { beforeEach, expect, it, vi } from "vitest";
import type { LearningEvent } from "@wiggle/contracts";
import { EVENT_BATCH_SIZE, EVENT_QUEUE_KEY, MAX_RETRY_DELAY, EventQueue } from "../../features/events/eventQueue";
import { emitLearningEvent } from "../../features/events/emitLearningEvent";
import { ApiClient, ApiError } from "../../lib/api/client";
import { demoSession } from "../../lib/demo/seed";

beforeEach(() => localStorage.clear());
it("keeps the wire envelope minimal when passed the entire session DTO", () => {
  const event = emitLearningEvent(new EventQueue(), demoSession("session"), { kind: "task_started" }, "local");
  expect(Object.keys(event).sort()).toEqual(["childId", "id", "occurredAt", "payload", "sessionId", "type"]);
});

it("retries a failed completion with the same key after reload, after ordinary events", async () => {
  let now = 1000;
  const queue = new EventQueue(undefined, () => now);
  const client = new ApiClient();
  const events = vi.spyOn(client, "events").mockImplementation(async body => ({ acceptedEventIds: body.events.map(event => event.id) }));
  const complete = vi.spyOn(client, "complete").mockRejectedValueOnce(new Error("offline")).mockResolvedValue({} as never);
  const session = demoSession("session");
  emitLearningEvent(queue, session, { kind: "task_started" }, "api");
  emitLearningEvent(queue, session, { kind: "mission_completed", correctness: .92, objective: session.objective, mode: "visual_gesture" }, "api", "completion-key");
  const signal = new AbortController().signal;
  await expect(queue.flush(client, signal, "session")).rejects.toThrow("offline");
  expect(events).toHaveBeenCalledTimes(1);
  expect(queue.entries()).toHaveLength(1);
  now += 1000;
  const reloaded = new EventQueue(undefined, () => now);
  await reloaded.flush(client, signal, "session");
  expect(complete).toHaveBeenNthCalledWith(2, { sessionId: "session", correctness: .92 }, "completion-key", signal);
  expect(reloaded.entries()).toHaveLength(0);
  expect(events.mock.calls.flatMap(([body]) => body.events).some(event => event.type === "mission_completed")).toBe(false);
});

it("retains events without acknowledgement and coalesces simultaneous flushes", async () => {
  const queue = new EventQueue();
  const client = new ApiClient();
  vi.spyOn(client, "events").mockResolvedValue({ acceptedEventIds: [] });
  emitLearningEvent(queue, demoSession("session"), { kind: "first_interaction" }, "api");
  const signal = new AbortController().signal;
  const first = queue.flush(client, signal, "session");
  expect(queue.flush(client, signal, "session")).toBe(first);
  await expect(first).rejects.toThrow("not acknowledged");
  expect(queue.entries()).toHaveLength(1);
});

it.each([404, 503])("isolates an older session rejected with %i from a fresh completion", async status => {
  const queue = new EventQueue();
  const client = new ApiClient();
  const events = vi.spyOn(client, "events").mockImplementation(async body => {
    if (body.events[0].sessionId === "old") throw new ApiError(status);
    return { acceptedEventIds: body.events.map(event => event.id) };
  });
  const complete = vi.spyOn(client, "complete").mockResolvedValue({} as never);
  emitLearningEvent(queue, demoSession("old"), { kind: "task_started" }, "api");
  emitLearningEvent(queue, demoSession("fresh"), { kind: "task_started" }, "api");
  emitLearningEvent(queue, demoSession("fresh"), { kind: "mission_completed", correctness: .92, objective: "identify-three-quarters", mode: "visual_gesture" }, "api");
  await queue.flush(client, new AbortController().signal);
  expect(complete).toHaveBeenCalledWith({ sessionId: "fresh", correctness: .92 }, expect.any(String), expect.any(AbortSignal));
  expect(queue.entries()).toHaveLength(1);
  expect(queue.entries()[0].quarantined).toBe(status === 404 ? 404 : undefined);
  expect(new EventQueue().entries()[0].event.sessionId).toBe("old");
  await queue.flush(client, new AbortController().signal);
  expect(events).toHaveBeenCalledTimes(2);
});

it("persists capped exponential retry delays and batches telemetry before completion", async () => {
  let now = 1000;
  const queue = new EventQueue(undefined, () => now);
  const client = new ApiClient();
  const events = vi.spyOn(client, "events").mockRejectedValue(new ApiError(429));
  for (let index = 0; index < 30; index++) emitLearningEvent(queue, demoSession("session"), { kind: "task_started" }, "api");
  const signal = new AbortController().signal;
  for (let attempt = 0; attempt < 9; attempt++) {
    await expect(queue.flush(client, signal, "session")).rejects.toThrow();
    const delay = Math.min(MAX_RETRY_DELAY, 1000 * 2 ** attempt);
    expect(queue.nextRetryDelay()).toBe(delay);
    expect(new EventQueue(undefined, () => now).nextRetryDelay()).toBe(delay);
    await queue.flush(client, signal);
    expect(events).toHaveBeenCalledTimes(attempt + 1);
    now += delay;
  }
  events.mockImplementation(async body => ({ acceptedEventIds: body.events.map(event => event.id) }));
  const complete = vi.spyOn(client, "complete").mockResolvedValue({} as never);
  emitLearningEvent(queue, demoSession("session"), { kind: "mission_completed", correctness: .92, objective: "identify-three-quarters", mode: "visual_gesture" }, "api");
  await queue.flush(client, signal, "session");
  expect(events.mock.calls.slice(-2).map(([body]) => body.events.length)).toEqual([EVENT_BATCH_SIZE, 5]);
  expect(complete).toHaveBeenCalledOnce();
  expect(queue.entries()).toHaveLength(0);
});

it("bounds each drain to four batches and resumes the remaining evidence", async () => {
  const queue = new EventQueue();
  const client = new ApiClient();
  const events = vi.spyOn(client, "events").mockImplementation(async body => ({ acceptedEventIds: body.events.map(event => event.id) }));
  for (let index = 0; index < 110; index++) emitLearningEvent(queue, demoSession("session"), { kind: "task_started" }, "api");
  await queue.flush(client, new AbortController().signal);
  expect(events).toHaveBeenCalledTimes(4);
  expect(queue.entries()).toHaveLength(10);
  await queue.flush(client, new AbortController().signal);
  expect(queue.entries()).toHaveLength(0);
});

it("recovers valid entries from corrupt storage and works when storage is denied", () => {
  const event = emitLearningEvent(new EventQueue(), demoSession("session"), { kind: "task_started" }, "local");
  localStorage.setItem(EVENT_QUEUE_KEY, JSON.stringify({ version: 1, entries: [{ event, transport: "local" }, { event: { type: "invalid" }, transport: "api" }] }));
  expect(new EventQueue().entries()).toHaveLength(1);
  const denied = new EventQueue({ getItem: () => { throw new Error("denied"); }, setItem: () => { throw new Error("quota"); } });
  denied.enqueue(event as LearningEvent, "local");
  expect(denied.entries()).toHaveLength(1);
});
