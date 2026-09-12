// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { publishWiggleLiveEvent, subscribeWiggleLiveEvents } from "./wiggleLiveChannel";

describe("wiggleLiveChannel", () => {
  it("delivers a published event to a subscriber", async () => {
    const received: unknown[] = [];
    const unsubscribe = subscribeWiggleLiveEvents(event => received.push(event));
    publishWiggleLiveEvent({ type: "mission_completed", childId: "child-1", missionTitle: "Fraction Forest Mission 3", occurredAt: "2026-09-13T00:00:00Z" });
    await new Promise(resolve => setTimeout(resolve, 10));
    expect(received).toEqual([{ type: "mission_completed", childId: "child-1", missionTitle: "Fraction Forest Mission 3", occurredAt: "2026-09-13T00:00:00Z" }]);
    unsubscribe();
  });

  it("never throws when BroadcastChannel is unavailable", () => {
    const original = window.BroadcastChannel;
    // @ts-expect-error simulating an unsupported browser
    delete window.BroadcastChannel;
    expect(() => publishWiggleLiveEvent({ type: "mission_completed", childId: "c", missionTitle: "m", occurredAt: "2026-09-13T00:00:00Z" })).not.toThrow();
    const unsubscribe = subscribeWiggleLiveEvents(vi.fn());
    expect(() => unsubscribe()).not.toThrow();
    window.BroadcastChannel = original;
  });
});
