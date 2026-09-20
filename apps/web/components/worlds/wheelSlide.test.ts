import { describe, expect, it } from "vitest";
import { INITIAL_WHEEL_STATE, WHEEL_COOLDOWN_MS, WHEEL_IDLE_MS, WHEEL_THRESHOLD, wheelSlide, type WheelState } from "./wheelSlide";

const notch = (deltaY: number) => ({ deltaX: 0, deltaY, deltaMode: 0 });

describe("wheelSlide", () => {
  it("moves one planet forward for a scroll down and back for a scroll up", () => {
    expect(wheelSlide(INITIAL_WHEEL_STATE, notch(100), 1000).direction).toBe(1);
    expect(wheelSlide(INITIAL_WHEEL_STATE, notch(-100), 1000).direction).toBe(-1);
  });

  it("follows a sideways swipe when that is the bigger movement", () => {
    expect(wheelSlide(INITIAL_WHEEL_STATE, { deltaX: 90, deltaY: 10, deltaMode: 0 }, 1000).direction).toBe(1);
    expect(wheelSlide(INITIAL_WHEEL_STATE, { deltaX: -90, deltaY: 10, deltaMode: 0 }, 1000).direction).toBe(-1);
  });

  it("waits for a real scroll instead of reacting to a tiny nudge, then adds small ones up", () => {
    let result = wheelSlide(INITIAL_WHEEL_STATE, notch(WHEEL_THRESHOLD / 4), 1000);
    expect(result.direction).toBe(0);
    for (let step = 1; step < 4; step++) result = wheelSlide(result.state, notch(WHEEL_THRESHOLD / 4), 1000 + step * 16);
    expect(result.direction).toBe(1);
  });

  it("treats a trackpad flick's trailing inertia as one move", () => {
    let state: WheelState = INITIAL_WHEEL_STATE;
    const moves: number[] = [];
    for (let time = 1000; time < 1000 + WHEEL_COOLDOWN_MS - 20; time += 16) {
      const result = wheelSlide(state, notch(120 - (time - 1000) / 4), time);
      state = result.state;
      if (result.direction) moves.push(result.direction);
    }
    expect(moves).toEqual([1]);
  });

  it("moves again once the cooldown has passed", () => {
    const first = wheelSlide(INITIAL_WHEEL_STATE, notch(100), 1000);
    expect(wheelSlide(first.state, notch(100), 1000 + WHEEL_COOLDOWN_MS - 1).direction).toBe(0);
    expect(wheelSlide(first.state, notch(100), 1000 + WHEEL_COOLDOWN_MS + 1).direction).toBe(1);
  });

  it("forgets a half-finished scroll after a pause or a change of direction", () => {
    const partial = wheelSlide(INITIAL_WHEEL_STATE, notch(WHEEL_THRESHOLD - 5), 1000);
    expect(wheelSlide(partial.state, notch(10), 1000 + WHEEL_IDLE_MS + 1).direction).toBe(0);
    expect(wheelSlide(partial.state, notch(-10), 1050).direction).toBe(0);
  });

  it("reads line-based wheels (deltaMode 1) in pixels and ignores empty events", () => {
    expect(wheelSlide(INITIAL_WHEEL_STATE, { deltaX: 0, deltaY: 3, deltaMode: 1 }, 1000).direction).toBe(1);
    expect(wheelSlide(INITIAL_WHEEL_STATE, { deltaX: 0, deltaY: 0, deltaMode: 0 }, 1000)).toEqual({ direction: 0, state: INITIAL_WHEEL_STATE });
  });
});
