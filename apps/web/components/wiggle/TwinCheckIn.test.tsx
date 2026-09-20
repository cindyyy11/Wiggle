// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { TwinCheckIn } from "./TwinCheckIn";

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
});

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  delete (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition;
});

describe("TwinCheckIn", () => {
  it("responds warmly to a tapped mood, never as a score", () => {
    render(<TwinCheckIn />);
    fireEvent.click(screen.getByRole("button", { name: "Tricky" }));
    expect(screen.getByRole("status").textContent).toMatch(/gentler together/);
    expect(document.body.textContent).not.toMatch(/\d+%/);
  });

  it("responds to a spoken transcript through the same voice plumbing as Lexi", () => {
    render(<TwinCheckIn />);
    fireEvent.click(screen.getByRole("button", { name: "Or tell me" }));
    act(() => lastInstance!.onresult?.({ results: [[{ transcript: "Today was so much fun" }]] }));
    expect(screen.getByRole("status").textContent).toMatch(/keep that going/);
  });

  it("isn't fooled by a negated positive like 'not fun' into cheering it as great", () => {
    render(<TwinCheckIn />);
    fireEvent.click(screen.getByRole("button", { name: "Or tell me" }));
    act(() => lastInstance!.onresult?.({ results: [[{ transcript: "It was not fun at all" }]] }));
    expect(screen.getByRole("status").textContent).toMatch(/gentler together/);
  });

  it("catches more phrasings of tricky feelings than the original word list", () => {
    render(<TwinCheckIn />);
    fireEvent.click(screen.getByRole("button", { name: "Or tell me" }));
    act(() => lastInstance!.onresult?.({ results: [[{ transcript: "I didn't like it, it was boring" }]] }));
    expect(screen.getByRole("status").textContent).toMatch(/gentler together/);
  });

  it("catches more phrasings of great feelings than the original word list", () => {
    render(<TwinCheckIn />);
    fireEvent.click(screen.getByRole("button", { name: "Or tell me" }));
    act(() => lastInstance!.onresult?.({ results: [[{ transcript: "That was so cool!" }]] }));
    expect(screen.getByRole("status").textContent).toMatch(/keep that going/);
  });

  it("lets the child change their mind", () => {
    render(<TwinCheckIn />);
    fireEvent.click(screen.getByRole("button", { name: "Great" }));
    expect(screen.getByRole("status").textContent).toMatch(/keep that going/);
    fireEvent.click(screen.getByRole("button", { name: "Okay" }));
    expect(screen.getByRole("status").textContent).toMatch(/good place to be/);
  });

  it("offers a real way to change activity when things feel tricky", () => {
    render(<TwinCheckIn />);
    fireEvent.click(screen.getByRole("button", { name: "Tricky" }));
    const link = screen.getByRole("link", { name: /Let's try something else for now/ });
    expect(link.getAttribute("href")).toBe("/");
  });

  it("does not show the gentle link for Great or Okay", () => {
    render(<TwinCheckIn />);
    fireEvent.click(screen.getByRole("button", { name: "Great" }));
    expect(screen.queryByRole("link", { name: /Let's try something else for now/ })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Okay" }));
    expect(screen.queryByRole("link", { name: /Let's try something else for now/ })).toBeNull();
  });
});
