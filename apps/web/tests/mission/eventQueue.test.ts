// @vitest-environment jsdom
import { beforeEach, expect, it, vi } from "vitest";
import type { LearningEvent } from "@wiggle/contracts";
import { EVENT_QUEUE_KEY, EventQueue } from "../../features/events/eventQueue";
import { emitLearningEvent } from "../../features/events/emitLearningEvent";
import { ApiClient } from "../../lib/api/client";
import { demoSession } from "../../lib/demo/seed";

beforeEach(() => localStorage.clear());
it("keeps the wire envelope minimal when passed the entire session DTO", () => {
  const event = emitLearningEvent(new EventQueue(), demoSession("session"), { kind: "task_started" }, "local");
  expect(Object.keys(event).sort()).toEqual(["childId", "id", "occurredAt", "payload", "sessionId", "type"]);
});

it("retries a failed completion with the same key after reload, after ordinary events", async () => {
  const queue = new EventQueue();
  const client = new ApiClient();
  const events = vi.spyOn(client, "events").mockImplementation(async body => ({ acceptedEventIds: body.events.map(event => event.id) }));
  const complete = vi.spyOn(client, "complete").mockRejectedValueOnce(new Error("offline")).mockResolvedValue({} as never);
  const session = demoSession("session");
  emitLearningEvent(queue, session, { kind: "task_started" }, "api");
  emitLearningEvent(queue, session, { kind: "mission_completed", correctness: .92, objective: session.objective, mode: "visual_gesture" }, "api", "completion-key");
  const signal = new AbortController().signal;
  await expect(queue.flush(client, signal)).rejects.toThrow("offline");
  expect(events).toHaveBeenCalledTimes(1);
  expect(queue.entries()).toHaveLength(1);
  const reloaded = new EventQueue();
  await reloaded.flush(client, signal);
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
  const first = queue.flush(client, signal);
  expect(queue.flush(client, signal)).toBe(first);
  await expect(first).rejects.toThrow("not acknowledged");
  expect(queue.entries()).toHaveLength(1);
});

it("recovers valid entries from corrupt storage and works when storage is denied", () => {
  const event = emitLearningEvent(new EventQueue(), demoSession("session"), { kind: "task_started" }, "local");
  localStorage.setItem(EVENT_QUEUE_KEY, JSON.stringify({ version: 1, entries: [{ event, transport: "local" }, { event: { type: "invalid" }, transport: "api" }] }));
  expect(new EventQueue().entries()).toHaveLength(1);
  const denied = new EventQueue({ getItem: () => { throw new Error("denied"); }, setItem: () => { throw new Error("quota"); } });
  denied.enqueue(event as LearningEvent, "local");
  expect(denied.entries()).toHaveLength(1);
});
