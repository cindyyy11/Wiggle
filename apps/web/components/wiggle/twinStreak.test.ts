// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { recordTwinVisit } from "./twinStreak";

beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); window.localStorage.clear(); });

describe("recordTwinVisit", () => {
  it("starts a new streak at 1 on the first visit", () => {
    vi.setSystemTime(new Date("2026-09-15T09:00:00Z"));
    expect(recordTwinVisit("child-1")).toBe(1);
  });

  it("does not double-count a second visit the same day", () => {
    vi.setSystemTime(new Date("2026-09-15T09:00:00Z"));
    recordTwinVisit("child-1");
    vi.setSystemTime(new Date("2026-09-15T20:00:00Z"));
    expect(recordTwinVisit("child-1")).toBe(1);
  });

  it("grows the streak on a consecutive-day visit", () => {
    vi.setSystemTime(new Date("2026-09-15T09:00:00Z"));
    recordTwinVisit("child-1");
    vi.setSystemTime(new Date("2026-09-16T09:00:00Z"));
    expect(recordTwinVisit("child-1")).toBe(2);
    vi.setSystemTime(new Date("2026-09-17T09:00:00Z"));
    expect(recordTwinVisit("child-1")).toBe(3);
  });

  it("resets the streak after a missed day", () => {
    vi.setSystemTime(new Date("2026-09-15T09:00:00Z"));
    recordTwinVisit("child-1");
    vi.setSystemTime(new Date("2026-09-18T09:00:00Z"));
    expect(recordTwinVisit("child-1")).toBe(1);
  });

  it("keeps separate streaks per child", () => {
    vi.setSystemTime(new Date("2026-09-15T09:00:00Z"));
    recordTwinVisit("child-1");
    recordTwinVisit("child-1");
    expect(recordTwinVisit("child-2")).toBe(1);
  });
});
