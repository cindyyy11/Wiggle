// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { playSplashChimeOnce } from "./splashChime";

const created: unknown[] = [];

class FakeAudioContext {
  state = "running";
  currentTime = 0;
  destination = {};
  constructor() { created.push(this); }
  createOscillator() { return { type: "sine", frequency: { setValueAtTime() {} }, connect: (node: unknown) => node, start() {}, stop() {} }; }
  createGain() { return { gain: { setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect: (node: unknown) => node }; }
  resume() { return Promise.resolve(); }
  close() { return Promise.resolve(); }
}

beforeEach(() => {
  created.length = 0;
  vi.stubGlobal("AudioContext", FakeAudioContext);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  window.sessionStorage.clear();
  window.localStorage.clear();
});

describe("playSplashChimeOnce", () => {
  it("plays on the first launch of a session", () => {
    expect(playSplashChimeOnce()).toBe(true);
    expect(created).toHaveLength(1);
  });

  it("stays silent on a refresh in the same session", () => {
    expect(playSplashChimeOnce()).toBe(true);
    expect(playSplashChimeOnce()).toBe(false);
    expect(created).toHaveLength(1);
  });

  it("stays silent when the navigation is a reload", () => {
    vi.spyOn(performance, "getEntriesByType").mockReturnValue([{ type: "reload" } as PerformanceNavigationTiming]);
    expect(playSplashChimeOnce()).toBe(false);
    expect(created).toHaveLength(0);
  });

  it("stays silent while Wiggle is muted", () => {
    window.localStorage.setItem("wiggle:muted", "1");
    expect(playSplashChimeOnce()).toBe(false);
    expect(created).toHaveLength(0);
  });

  it("never throws when AudioContext is unavailable", () => {
    vi.stubGlobal("AudioContext", undefined);
    expect(playSplashChimeOnce()).toBe(false);
  });
});
