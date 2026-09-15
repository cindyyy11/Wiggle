// apps/web/components/wiggle/TwinLauncher.test.tsx
// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { LearnerTwin } from "@wiggle/contracts";
import { TwinLauncher } from "./TwinLauncher";
import type { ApiClient } from "../../lib/api/client";

afterEach(() => { cleanup(); window.localStorage.clear(); });

const twin: LearnerTwin = {
  mastery: { fractions: 0.1 },
  initiationFriction: 0.5, persistenceFriction: 0.5, cognitiveLoad: 0.5, transitionFriction: 0.5, fatigueEstimate: 0.5,
  modalityEffectiveness: { visual: 0.65, voice: 0.2, gesture: 0.2, movement: 0.2, story: 0.2, text: 0.2 },
  strategyEffectiveness: { chunking: 0.1, movementBreak: 0.1, visualHint: 0.1, voiceHint: 0.1, choice: 0.1 },
};

function fakeClient(response: LearnerTwin | (() => LearnerTwin)): ApiClient {
  return { twin: async () => ({ twin: typeof response === "function" ? response() : response }) } as unknown as ApiClient;
}

function openLauncher() {
  fireEvent.click(screen.getByRole("button", { name: "Ready for a mission whenever you are!" }));
}

describe("TwinLauncher", () => {
  it("opens to show the Twin's current mood, a suggestion, read-aloud, and a link to the full Twin page", async () => {
    render(<TwinLauncher childId="child-1" client={fakeClient(twin)} />);
    openLauncher();
    expect(screen.getByRole("heading", { name: "My Wiggle Twin" })).toBeTruthy();
    expect(screen.getByRole("status").textContent).toContain("Ready for a mission whenever you are!");
    await screen.findByText(/Pictures and diagrams help you learn fast\./);
    expect(screen.getByRole("button", { name: "Read aloud" })).toBeTruthy();
    const twinPage = screen.getByRole("link", { name: "See my whole Twin" });
    expect(twinPage.getAttribute("href")).toBe("/twin?child=child-1");
    const goTo = screen.getByRole("link", { name: "Go to Colors Canyon" });
    expect(goTo.getAttribute("href")).toBe("/?child=child-1&world=science&zone=colors");
    expect(document.body.textContent).not.toMatch(/\d+%/);
  });

  it("avoids repeating the same suggestion the next time the panel opens", async () => {
    render(<TwinLauncher childId="child-1" client={fakeClient(twin)} />);
    openLauncher();
    await screen.findByRole("link", { name: "Go to Colors Canyon" });
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    openLauncher();
    const goTo = await screen.findByRole("link", { name: "Go to Life Cycle Garden" });
    expect(goTo.getAttribute("href")).toContain("zone=life-cycle");
  });

  it("adds a Science-specific line only when the context is science", async () => {
    render(<TwinLauncher childId="child-1" client={fakeClient(twin)} context="science" />);
    openLauncher();
    await screen.findByText(/Science is full of surprises today!/);
  });

  it("closes on Escape and returns focus to the launcher button", async () => {
    render(<TwinLauncher childId="child-1" client={fakeClient(twin)} />);
    openLauncher();
    const panel = await screen.findByRole("region", { name: "My Wiggle Twin" });
    fireEvent.keyDown(panel, { key: "Escape" });
    expect(screen.queryByRole("region", { name: "My Wiggle Twin" })).toBeNull();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Ready for a mission whenever you are!" }));
  });

  it("reads the current message aloud", async () => {
    const speak = vi.fn();
    (window as unknown as { speechSynthesis: unknown }).speechSynthesis = { speak, cancel: vi.fn() };
    (window as unknown as { SpeechSynthesisUtterance: unknown }).SpeechSynthesisUtterance = class { constructor(public text: string) {} };
    render(<TwinLauncher childId="child-1" client={fakeClient(twin)} />);
    openLauncher();
    fireEvent.click(screen.getByRole("button", { name: "Read aloud" }));
    expect(speak).toHaveBeenCalledTimes(1);
  });

  it("falls back gracefully when the backend is unavailable", async () => {
    const failingClient = { twin: async () => { throw new Error("offline"); } } as unknown as ApiClient;
    render(<TwinLauncher childId="child-1" client={failingClient} />);
    openLauncher();
    expect(await screen.findByRole("link", { name: "See my whole Twin" })).toBeTruthy();
  });
});
