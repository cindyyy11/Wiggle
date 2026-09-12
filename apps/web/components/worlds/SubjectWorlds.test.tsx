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

vi.mock("./WorldsConstellation", () => ({
  WorldsConstellation: (props: { onSelect: (world: "math" | "science" | "english" | "bm") => void; activeWorld: string | null }) => <>
    <div data-testid="mock-constellation" data-active-world={props.activeWorld ?? ""} />
    <button type="button" onClick={() => props.onSelect("math")}>Select modeled Numeria</button>
    <button type="button" onClick={() => props.onSelect("english")}>Select modeled English</button>
  </>,
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

it("keeps the splash, then routes Numeria from either orbit control to the existing MissionAtlas", () => {
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

  expect(screen.getByRole("region", { name: "Welcome to Wiggle" })).toBeTruthy();
  enterWorlds();
  expect(screen.getByRole("region", { name: "Choose a subject world" })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Explore Numeria" }));
  expect(window.location.search).toBe("?child=owned&world=math");
  expect(screen.getByTestId("maths-props").dataset).toMatchObject({
    childId: "owned",
    demo: "false",
    quality: "fallback",
    splash: "false",
  });
  expect((missionProps.current as { client?: unknown }).client).toBe(client);
  fireEvent.click(screen.getByRole("button", { name: "Back to Worlds" }));
  expect(screen.getByRole("region", { name: "Choose a subject world" })).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Let's Wiggle" })).toBeNull();

  fireEvent.click(screen.getByRole("button", { name: "Select modeled Numeria" }));
  expect(window.location.search).toBe("?child=owned&world=math");
  expect(screen.getByTestId("maths-props").dataset).toMatchObject({
    childId: "owned",
    demo: "false",
    quality: "fallback",
    splash: "false",
  });
  expect((missionProps.current as { client?: unknown }).client).toBe(client);
});

it("opens a direct Science route after the splash and preserves child context when returning to Worlds", () => {
  vi.useFakeTimers();
  render(<SubjectWorlds initialRoute={{ world: "science", zone: "magnet-lab", child: "owned" }} />);

  enterWorlds();
  expect(screen.getByRole("region", { name: "Science Planet" })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Visit Sink & Float Bay" }));
  expect(window.location.search).toBe("?child=owned&world=science&zone=sink-float");
  expect(screen.getByRole("button", { name: "Back to Worlds" })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Back to Worlds" }));
  expect(window.location.search).toBe("?child=owned");
  expect(screen.getByRole("region", { name: "Choose a subject world" })).toBeTruthy();
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
