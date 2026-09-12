// @vitest-environment jsdom
import React from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { SubjectWorlds } from "./SubjectWorlds";

const missionProps = vi.hoisted(() => ({ current: undefined as unknown }));

vi.mock("../mission/MissionAtlas", () => ({
  MissionAtlas: (props: {
    childId?: string;
    allowLocalFallback?: boolean;
    client?: unknown;
    quality?: string;
    showSplash?: boolean;
    onMissionOverlayChange?: (open: boolean) => void;
    onWorldsRequest?: () => void;
  }) => {
    missionProps.current = props;
    return <section aria-label="Mock Numeria">
    <output
      data-testid="maths-props"
      data-child-id={props.childId}
      data-demo={String(props.allowLocalFallback)}
      data-quality={props.quality}
      data-splash={String(props.showSplash)}
    />
    <button type="button" onClick={() => props.onMissionOverlayChange?.(true)}>Open Maths mission</button>
    <button type="button" onClick={() => props.onWorldsRequest?.()}>Back to Worlds</button>
    </section>;
  },
}));

afterEach(() => {
  vi.useRealTimers();
  cleanup();
  window.history.replaceState({}, "", "/");
});

function enterWorlds() {
  fireEvent.click(screen.getByRole("button", { name: "Let's Wiggle" }));
  act(() => vi.advanceTimersByTime(320));
}

it("opens Worlds once, features Science, and forwards owned Maths props unchanged", () => {
  vi.useFakeTimers();
  const client = {} as never;
  render(
    <SubjectWorlds
      childId="owned"
      allowLocalFallback={false}
      client={client}
      quality="fallback"
      initialRoute={{ world: null, child: "owned" }}
    />,
  );

  enterWorlds();
  expect(screen.getByRole("region", { name: "Choose a subject world" })).toBeTruthy();
  expect(screen.getByRole("button", { name: "Explore Science Planet" }).getAttribute("aria-pressed")).toBe("true");
  fireEvent.click(screen.getByRole("button", { name: "Explore Numeria" }));
  expect(screen.getByTestId("maths-props").dataset).toMatchObject({
    childId: "owned",
    demo: "false",
    quality: "fallback",
    splash: "false",
  });
  expect((missionProps.current as { client?: unknown }).client).toBe(client);
  expect(window.location.search).toBe("?child=owned&world=math");
});

it("opens a direct Science route after the splash with an honest staging region", () => {
  vi.useFakeTimers();
  render(<SubjectWorlds initialRoute={{ world: "science", zone: "magnet-lab", child: "owned" }} />);

  enterWorlds();
  expect(screen.getByRole("region", { name: "Science Planet" })).toBeTruthy();
  expect(screen.getByRole("button", { name: "Back to Worlds" })).toBeTruthy();
  expect(screen.queryByRole("region", { name: "Choose a subject world" })).toBeNull();
});

it("announces locked worlds without changing the route and blocks navigation away from active Maths", () => {
  vi.useFakeTimers();
  render(<SubjectWorlds childId="owned" allowLocalFallback={false} initialRoute={{ world: null, child: "owned" }} />);

  enterWorlds();
  const english = screen.getByRole("button", { name: "English (coming soon)" });
  english.focus();
  fireEvent.click(english);
  expect(document.activeElement).toBe(english);
  expect(screen.getByRole("status").textContent).toContain("English is coming soon");
  expect(window.location.search).toBe("");

  fireEvent.click(screen.getByRole("button", { name: "Explore Numeria" }));
  fireEvent.click(screen.getByRole("button", { name: "Open Maths mission" }));
  window.history.pushState({}, "", "/?child=owned&world=science&zone=magnet-lab");
  act(() => window.dispatchEvent(new PopStateEvent("popstate")));
  expect(screen.getByTestId("maths-props")).toBeTruthy();
  expect(window.location.search).toBe("?child=owned&world=math");
  expect(screen.getByText("Finish or leave your Maths mission before changing worlds.")).toBeTruthy();
});
