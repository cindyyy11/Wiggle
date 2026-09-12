// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { AMBIENT_TRACKS, useAmbientSound } from "./useAmbientSound";

describe("useAmbientSound", () => {
  it("starts quiet by default", () => {
    const { result } = renderHook(() => useAmbientSound());
    expect(result.current.track).toBe("quiet");
  });

  it("lists all five tracks with Quiet as an explicit, sound-free option", () => {
    expect(AMBIENT_TRACKS.map(track => track.id)).toEqual(["quiet", "calm", "forest", "rain", "waves"]);
  });

  it("never throws switching tracks even when AudioContext is unavailable", () => {
    const { result } = renderHook(() => useAmbientSound());
    for (const track of AMBIENT_TRACKS) {
      expect(() => act(() => result.current.setTrack(track.id))).not.toThrow();
    }
    expect(result.current.track).toBe("waves");
  });
});
