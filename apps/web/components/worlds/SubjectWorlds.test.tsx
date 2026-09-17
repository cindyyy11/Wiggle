// @vitest-environment jsdom
import React from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { SubjectWorlds } from "./SubjectWorlds";

const missionProps = vi.hoisted(() => ({ current: undefined as unknown }));
const soundPlay = vi.hoisted(() => vi.fn());

vi.mock("../../features/audio/useWiggleSound", () => ({
  useWiggleSound: () => ({
    play: soundPlay,
    unlock: () => undefined,
    muted: false,
    setMuted: () => undefined,
  }),
}));

vi.mock("../mission/MissionAtlas", () => ({
  MATHS_MISSION_BLOCKED_MESSAGE: "Finish or leave your Maths mission before changing worlds.",
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
  soundPlay.mockClear();
});

function enterWorlds() {
  act(() => vi.advanceTimersByTime(900 + 320));
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
  expect(screen.queryByRole("region", { name: "Welcome to Wiggle" })).toBeNull();

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
  fireEvent.click(screen.getByRole("button", { name: "Visit Animal Types" }));
  expect(window.location.search).toBe("?child=owned&world=science&zone=animals");
  expect(screen.getByRole("button", { name: "Back to Worlds" })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Back to Worlds" }));
  expect(window.location.search).toBe("?child=owned");
  expect(screen.getByRole("region", { name: "Choose a subject world" })).toBeTruthy();
});

it("announces locked worlds without changing the route and blocks navigation away from active Maths", () => {
  vi.useFakeTimers();
  render(<SubjectWorlds childId="owned" allowLocalFallback={false} initialRoute={{ world: null, child: "owned" }} />);

  enterWorlds();
  fireEvent.click(screen.getByRole("button", { name: "Show English" }));
  expect(screen.getByText("Coming soon", { selector: "span" })).toBeTruthy();
  expect(document.body.textContent).not.toContain("🔒");
  expect(document.querySelector('[aria-hidden="true"]')).toBeTruthy();
  const english = screen.getByRole("button", { name: "English (coming soon)" });
  english.focus();
  fireEvent.click(english);
  expect(document.activeElement).toBe(english);
  expect(screen.getByRole("status").textContent).toContain("English is coming soon");
  expect(window.location.search).toBe("");

  fireEvent.click(screen.getByRole("button", { name: "Show Numeria" }));
  fireEvent.click(screen.getByRole("button", { name: "Explore Numeria" }));
  fireEvent.click(screen.getByRole("button", { name: "Open Maths mission" }));
  window.history.pushState({}, "", "/?child=owned&world=science&zone=magnet-lab");
  act(() => window.dispatchEvent(new PopStateEvent("popstate")));
  expect(screen.getByTestId("maths-props")).toBeTruthy();
  expect(window.location.search).toBe("?child=owned&world=math");
  expect(screen.getAllByText("Finish or leave your Maths mission before changing worlds.").length).toBeGreaterThan(0);
});

it("slides between planets without navigating and keeps locked planets on the chooser", () => {
  vi.useFakeTimers();
  render(<SubjectWorlds initialRoute={{ world: null }} quality="fallback" />);
  enterWorlds();
  expect(screen.getByRole("heading", { name: "Numeria" })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Next planet" }));
  expect(screen.getByRole("heading", { name: "Science Planet" })).toBeTruthy();
  expect(window.location.search).toBe("");
  fireEvent.click(screen.getByRole("button", { name: "Next planet" }));
  fireEvent.click(screen.getByRole("button", { name: "Bahasa Melayu (coming soon)" }));
  expect(window.location.search).toBe("");
  expect(screen.getByRole("status").textContent).toContain("Bahasa Melayu is coming soon");
  fireEvent.click(screen.getByRole("button", { name: "Previous planet" }));
  expect(screen.getByRole("button", { name: "Explore Science Planet" })).toBeTruthy();
});

it("plays slideWhoosh only when the selected planet actually changes", () => {
  vi.useFakeTimers();
  render(<SubjectWorlds initialRoute={{ world: null }} quality="fallback" />);
  enterWorlds();
  soundPlay.mockClear();

  fireEvent.click(screen.getByRole("button", { name: "Next planet" }));
  expect(screen.getByRole("heading", { name: "Science Planet" })).toBeTruthy();
  expect(soundPlay).toHaveBeenCalledWith("slideWhoosh");
  expect(soundPlay).toHaveBeenCalledTimes(1);

  fireEvent.click(screen.getByRole("button", { name: "Show English" }));
  soundPlay.mockClear();
  const layer = screen.getByTestId("mock-constellation").parentElement!;
  fireEvent.pointerDown(layer, { button: 0, clientX: 200, clientY: 100 });
  fireEvent.pointerUp(layer, { button: 0, clientX: 100, clientY: 100 });
  expect(screen.getByRole("heading", { name: "English" })).toBeTruthy();
  expect(soundPlay).not.toHaveBeenCalled();
});

it("shows the global Twin launcher and Parent link on the worlds hub, and hides the launcher during an active Maths mission", () => {
  vi.useFakeTimers();
  render(<SubjectWorlds childId="owned" allowLocalFallback={false} initialRoute={{ world: null, child: "owned" }} />);
  enterWorlds();

  expect(screen.getByRole("link", { name: "Parent mission control" })).toBeTruthy();
  expect(screen.getByRole("button", { name: "Ready for a mission whenever you are!" })).toBeTruthy();

  fireEvent.click(screen.getByRole("button", { name: "Explore Numeria" }));
  fireEvent.click(screen.getByRole("button", { name: "Open Maths mission" }));

  expect(screen.queryByRole("button", { name: "Ready for a mission whenever you are!" })).toBeNull();
  expect(screen.getByRole("button", { name: "Parent mission control" })).toBeTruthy();
  expect(screen.getByText("Finish or leave your Maths mission before changing worlds.")).toBeTruthy();
});

it("tells the Twin launcher when the child is in Science", async () => {
  vi.useFakeTimers();
  render(<SubjectWorlds initialRoute={{ world: "science", zone: "magnet-lab", child: "owned" }} />);
  enterWorlds();
  vi.useRealTimers();
  fireEvent.click(screen.getByRole("button", { name: "Ready for a mission whenever you are!" }));
  await screen.findByText(/Science is full of surprises today!/);
});
