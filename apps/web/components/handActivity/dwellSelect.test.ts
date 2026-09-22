import { describe, expect, it } from "vitest";
import { DWELL_MS, DwellSelector, LEAVE_GRACE_MS, type DwellInput } from "./dwellSelect";

const frame = (over: string | null, at: number, patch: Partial<DwellInput> = {}): DwellInput => ({ over, at, isTracking: true, enabled: true, ...patch });
const idle = { id: null, progress: 0, selected: null };

describe("DwellSelector", () => {
  it("has nothing to show before a hand is over a token", () => {
    expect(new DwellSelector().update(frame(null, 0))).toEqual(idle);
  });

  it("fills a ring while the hand stays on a token, and chooses it once when the ring is full", () => {
    const selector = new DwellSelector();
    expect(selector.update(frame("a", 0))).toEqual({ id: "a", progress: 0, selected: null });
    const half = selector.update(frame("a", DWELL_MS / 2));
    expect(half.progress).toBeCloseTo(.5);
    expect(half.selected).toBeNull();
    expect(selector.update(frame("a", DWELL_MS))).toEqual({ id: "a", progress: 1, selected: "a" });
  });

  it("does not choose the same token again until the hand has left it", () => {
    const selector = new DwellSelector();
    selector.update(frame("a", 0));
    expect(selector.update(frame("a", DWELL_MS)).selected).toBe("a");
    expect(selector.update(frame("a", DWELL_MS + 50))).toEqual(idle);
    expect(selector.update(frame("a", DWELL_MS * 3))).toEqual(idle);
    expect(selector.update(frame(null, DWELL_MS * 3 + 10))).toEqual(idle);
    expect(selector.update(frame("a", DWELL_MS * 3 + 20))).toEqual({ id: "a", progress: 0, selected: null });
    expect(selector.update(frame("a", DWELL_MS * 4 + 20)).selected).toBe("a");
  });

  it("starts a new ring from nothing when the hand moves straight to another token", () => {
    const selector = new DwellSelector();
    selector.update(frame("a", 0));
    expect(selector.update(frame("a", 900)).progress).toBeCloseTo(.75);
    expect(selector.update(frame("b", 1000))).toEqual({ id: "b", progress: 0, selected: null });
    expect(selector.update(frame("b", 1000 + DWELL_MS)).selected).toBe("b");
  });

  it("forgives a shaky hand: a short trip off the token keeps the ring, and the time away does not count", () => {
    const selector = new DwellSelector();
    selector.update(frame("a", 0));
    selector.update(frame("a", 600));
    const away = selector.update(frame(null, 700));
    expect(away.id).toBe("a");
    expect(away.progress).toBeCloseTo(700 / DWELL_MS);
    const back = selector.update(frame("a", 900));
    expect(back.progress).toBeCloseTo(700 / DWELL_MS);
    expect(selector.update(frame("a", 900 + DWELL_MS - 700)).selected).toBe("a");
  });

  it("never chooses anything while the hand is off the token", () => {
    const selector = new DwellSelector();
    selector.update(frame("a", 0));
    selector.update(frame("a", 1100));
    const away = selector.update(frame(null, 1150));
    expect(away.selected).toBeNull();
    expect(away.progress).toBeLessThan(1);
  });

  it("resets the ring once the hand has been away longer than the allowance", () => {
    const selector = new DwellSelector();
    selector.update(frame("a", 0));
    selector.update(frame("a", 600));
    selector.update(frame(null, 700));
    expect(selector.update(frame(null, 700 + LEAVE_GRACE_MS))).toEqual(idle);
    expect(selector.update(frame("a", 1400))).toEqual({ id: "a", progress: 0, selected: null });
  });

  it("resets immediately when the hand is lost, and never chooses", () => {
    const selector = new DwellSelector();
    selector.update(frame("a", 0));
    selector.update(frame("a", 1100));
    expect(selector.update(frame("a", 1300, { isTracking: false }))).toEqual(idle);
    expect(selector.update(frame("a", 1400))).toEqual({ id: "a", progress: 0, selected: null });
  });

  it("does nothing, and forgets any ring, while disabled", () => {
    const selector = new DwellSelector();
    selector.update(frame("a", 0));
    selector.update(frame("a", 600));
    expect(selector.update(frame("a", 700, { enabled: false }))).toEqual(idle);
    expect(selector.update(frame("a", 800))).toEqual({ id: "a", progress: 0, selected: null });
  });

  it("can be reset explicitly", () => {
    const selector = new DwellSelector();
    selector.update(frame("a", 0));
    selector.update(frame("a", 900));
    selector.reset();
    expect(selector.update(frame("a", 1000))).toEqual({ id: "a", progress: 0, selected: null });
  });
});
