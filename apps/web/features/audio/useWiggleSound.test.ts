// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useWiggleSound } from "./useWiggleSound";

afterEach(() => { window.localStorage.clear(); });

describe("useWiggleSound", () => {
  it("defaults to unmuted and never throws when AudioContext is unavailable", () => {
    const { result } = renderHook(() => useWiggleSound());
    expect(result.current.muted).toBe(false);
    expect(() => act(() => result.current.play("missionStart"))).not.toThrow();
  });

  it("remembers the mute preference across renders", () => {
    const { result, rerender } = renderHook(() => useWiggleSound());
    act(() => result.current.setMuted(true));
    rerender();
    expect(result.current.muted).toBe(true);
    expect(window.localStorage.getItem("wiggle:muted")).toBe("1");
  });

  it("plays nothing while muted", () => {
    const { result } = renderHook(() => useWiggleSound());
    act(() => result.current.setMuted(true));
    expect(() => act(() => result.current.play("correct"))).not.toThrow();
  });

  it("exposes unlock and plays magnet pull and stay effects without throwing", () => {
    const { result } = renderHook(() => useWiggleSound());
    expect(() => act(() => result.current.unlock())).not.toThrow();
    expect(() => act(() => result.current.play("magnetPull"))).not.toThrow();
    expect(() => act(() => result.current.play("magnetStay"))).not.toThrow();
  });
});
