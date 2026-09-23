// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import type { ParentInsightsResponse } from "@wiggle/contracts";
import { MyWiggleTwinScreen } from "./MyWiggleTwinScreen";
import type { ApiClient } from "../../lib/api/client";

afterEach(() => { cleanup(); window.localStorage.clear(); });

const baseTwin: ParentInsightsResponse = {
  childId: "child-1",
  completedMissions: 2,
  twin: {
    mastery: { fractions: 0.6 },
    initiationFriction: 0.3, persistenceFriction: 0.3, cognitiveLoad: 0.3, transitionFriction: 0.3, fatigueEstimate: 0.3,
    modalityEffectiveness: { visual: 0.82, voice: 0.5, gesture: 0.88, movement: 0.5, story: 0.5, text: 0.5 },
    strategyEffectiveness: { chunking: 0.5, movementBreak: 0.5, visualHint: 0.5, voiceHint: 0.5, choice: 0.5 },
  },
  insight: { text: "The visual + gesture activity finished at 92% accuracy." },
  today: { missionsCompleted: 1, independentMissions: 1, helpRequests: 0, resetBreaks: 0, learningMinutes: 5, offlineMinutes: 0 },
  weeklySummary: null,
};

function fakeClient(response: ParentInsightsResponse): ApiClient {
  return { childProgress: async () => response } as unknown as ApiClient;
}

describe("MyWiggleTwinScreen", () => {
  it("shows the child's Twin, unlocked stars, and never a raw percentage", async () => {
    render(<MyWiggleTwinScreen childId="child-1" client={fakeClient(baseTwin)} />);
    await screen.findByText("My Wiggle Twin");
    const missionsTile = screen.getByText("Missions completed").closest("div");
    expect(missionsTile?.querySelector("strong")?.textContent).toBe("2");
    expect(screen.getAllByText(/Visual Explorer/).length).toBeGreaterThan(0);
    expect(document.body.textContent).not.toMatch(/\d+%/);
    // The parent-facing accuracy phrasing must never leak onto the child screen.
    expect(document.body.textContent).not.toMatch(/accuracy/i);
  });

  it("lists Science Explorer when local science lands are complete", async () => {
    window.localStorage.setItem(
      "wiggle:planet-complete:child-1:science",
      JSON.stringify(["magnet-lab", "animals", "colors", "life-cycle"]),
    );
    render(<MyWiggleTwinScreen childId="child-1" client={fakeClient(baseTwin)} />);
    await screen.findByText("My Wiggle Twin");
    expect(screen.getAllByText(/Science Explorer/).length).toBeGreaterThan(0);
  });

  it("shows a clickable next step toward the nearest not-yet-unlocked star", async () => {
    render(<MyWiggleTwinScreen childId="child-1" client={fakeClient(baseTwin)} />);
    await screen.findByText("My Wiggle Twin");
    const link = await screen.findByRole("link", { name: /Go to .+/ });
    expect(link.getAttribute("href")).toMatch(/^\/\?child=child-1&world=(science|math)/);
  });

  it("suggests a different place on the next visit instead of repeating itself", async () => {
    const twoIdeas: ParentInsightsResponse = { ...baseTwin, twin: { ...baseTwin.twin, mastery: { fractions: 0.1 }, initiationFriction: 0.5 } };
    const { unmount } = render(<MyWiggleTwinScreen childId="child-1" client={fakeClient(twoIdeas)} />);
    const first = await screen.findByRole("link", { name: /Go to .+/ });
    const firstHref = first.getAttribute("href");
    unmount();
    render(<MyWiggleTwinScreen childId="child-1" client={fakeClient(twoIdeas)} />);
    const second = await screen.findByRole("link", { name: /Go to .+/ });
    expect(second.getAttribute("href")).not.toBe(firstHref);
  });

  it("never offers a Go to Fraction Forest link", async () => {
    render(<MyWiggleTwinScreen childId="child-1" client={fakeClient(baseTwin)} />);
    await screen.findByText("My Wiggle Twin");
    expect(screen.queryByRole("link", { name: /Fraction Forest/ })).toBeNull();
  });

  it("starts a one-day streak on first visit", async () => {
    render(<MyWiggleTwinScreen childId="child-1" client={fakeClient(baseTwin)} />);
    await screen.findByText("My Wiggle Twin");
    const streakTile = await screen.findByText("Day streak");
    expect(streakTile.closest("div")?.querySelector("strong")?.textContent).toBe("1");
  });

  it("celebrates a newly unlocked star only the first time it is seen", async () => {
    const { unmount } = render(<MyWiggleTwinScreen childId="child-2" client={fakeClient(baseTwin)} />);
    await screen.findByText(/New star/);
    unmount();
    render(<MyWiggleTwinScreen childId="child-2" client={fakeClient(baseTwin)} />);
    await screen.findByText("My Wiggle Twin");
    expect(screen.queryByText(/New star/)).toBeNull();
  });

  it("falls back gracefully when the backend is unavailable", async () => {
    const failingClient = { childProgress: async () => { throw new Error("offline"); } } as unknown as ApiClient;
    render(<MyWiggleTwinScreen childId="child-3" client={failingClient} />);
    await screen.findByText("My Wiggle Twin");
  });
});
