// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { isVoiceMuted, setVoiceMuted, speakIfUnmuted } from "./voicePreference";

afterEach(() => { window.localStorage.clear(); vi.restoreAllMocks(); });

describe("voicePreference", () => {
  it("defaults to unmuted", () => {
    expect(isVoiceMuted()).toBe(false);
  });

  it("persists the mute preference", () => {
    setVoiceMuted(true);
    expect(isVoiceMuted()).toBe(true);
    setVoiceMuted(false);
    expect(isVoiceMuted()).toBe(false);
  });

  it("speaks when unmuted and speech synthesis is available", () => {
    const speak = vi.fn();
    const cancel = vi.fn();
    (window as unknown as { speechSynthesis: unknown }).speechSynthesis = { speak, cancel };
    (window as unknown as { SpeechSynthesisUtterance: unknown }).SpeechSynthesisUtterance = class { constructor(public text: string) {} };
    speakIfUnmuted("Ready for a fraction mission?");
    expect(speak).toHaveBeenCalledTimes(1);
  });

  it("stays silent while muted", () => {
    setVoiceMuted(true);
    const speak = vi.fn();
    (window as unknown as { speechSynthesis: unknown }).speechSynthesis = { speak, cancel: vi.fn() };
    (window as unknown as { SpeechSynthesisUtterance: unknown }).SpeechSynthesisUtterance = class { constructor(public text: string) {} };
    speakIfUnmuted("Ready for a fraction mission?");
    expect(speak).not.toHaveBeenCalled();
  });
});
