// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useLexiVoice } from "./useLexiVoice";

class FakeRecognition extends EventTarget {
  continuous = false;
  interimResults = false;
  lang = "";
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null = null;
  onerror: (() => void) | null = null;
  onend: (() => void) | null = null;
  start = vi.fn();
  stop = vi.fn(() => this.onend?.());
  abort = vi.fn();
}

let lastInstance: FakeRecognition | null = null;

beforeEach(() => {
  lastInstance = null;
  (window as unknown as { SpeechRecognition: unknown }).SpeechRecognition = function SpeechRecognitionStub() {
    const instance = new FakeRecognition();
    lastInstance = instance;
    return instance;
  };
  (window as unknown as { speechSynthesis: unknown }).speechSynthesis = {
    cancel: vi.fn(),
    speak: vi.fn((utterance: SpeechSynthesisUtterance) => utterance.onstart?.(new Event("start") as unknown as SpeechSynthesisEvent)),
  };
  (window as unknown as { SpeechSynthesisUtterance: unknown }).SpeechSynthesisUtterance = class {
    onstart: ((event: Event) => void) | null = null;
    onend: ((event: Event) => void) | null = null;
    onerror: ((event: Event) => void) | null = null;
    rate = 1;
    constructor(public text: string) {}
  };
});

afterEach(() => {
  delete (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition;
});

describe("useLexiVoice", () => {
  it("reports supported when the browser exposes SpeechRecognition", () => {
    const { result } = renderHook(() => useLexiVoice({ onResult: vi.fn() }));
    expect(result.current.supported).toBe(true);
  });

  it("moves to listening on start and calls onResult with the transcript", () => {
    const onResult = vi.fn();
    const { result } = renderHook(() => useLexiVoice({ onResult }));
    act(() => result.current.start());
    expect(result.current.phase).toBe("listening");
    act(() => lastInstance!.onresult?.({ results: [[{ transcript: "I don't understand this" }]] }));
    expect(onResult).toHaveBeenCalledWith("I don't understand this");
  });

  it("returns to idle when recognition ends", () => {
    const { result } = renderHook(() => useLexiVoice({ onResult: vi.fn() }));
    act(() => result.current.start());
    act(() => result.current.stop());
    expect(result.current.phase).toBe("idle");
  });

  it("moves to speaking while a reply plays and sets the caption", () => {
    const { result } = renderHook(() => useLexiVoice({ onResult: vi.fn() }));
    act(() => result.current.speak("Let's try it with pictures."));
    expect(result.current.caption).toBe("Let's try it with pictures.");
    expect(result.current.phase).toBe("speaking");
  });
});
