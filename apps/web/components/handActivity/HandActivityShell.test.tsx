// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { CameraStatus } from "../../features/gestures/useHandTracking";
import { HELP_LINE, HandActivityShell, STARTING_LINE, type HandActivitySceneContext, type HandActivityShellProps } from "./HandActivityShell";

const mock = vi.hoisted(() => ({
  status: "starting" as CameraStatus,
  retry: vi.fn(),
  tracking: vi.fn(),
  video: { current: null },
  latest: { current: { isTracking: false } },
  speak: vi.fn(),
  unlock: vi.fn(),
}));
vi.mock("../../features/gestures/useHandTracking", () => ({
  useHandTracking: (options: unknown) => {
    mock.tracking(options);
    return { status: mock.status, video: mock.video, retry: mock.retry, latest: mock.latest };
  },
}));
vi.mock("../../features/voice/voicePreference", () => ({ speakIfUnmuted: (text: string) => mock.speak(text) }));
vi.mock("../../features/audio/useWiggleSound", () => ({
  useWiggleSound: () => ({ play: vi.fn(), unlock: mock.unlock, muted: false, setMuted: vi.fn() }),
}));

let scene: HandActivitySceneContext | null = null;
const props = (patch: Partial<HandActivityShellProps> = {}): HandActivityShellProps => ({
  label: "Animal Types activity",
  title: "Meet the neighbours",
  instruction: "Point at each animal to learn about it.",
  progress: { count: 1, total: 4, label: "discoveries" },
  step: "Step 1 of 2",
  coach: "Point at the horse!",
  exitLabel: "Back to Science Planet",
  onExit: vi.fn(),
  children: (context) => { scene = context; return <div data-testid="scene" />; },
  ...patch,
});

beforeEach(() => { mock.status = "starting"; scene = null; vi.clearAllMocks(); });
afterEach(cleanup);

it("asks for the camera the moment it opens and shows the getting-ready state", () => {
  const { container } = render(<HandActivityShell {...props()} />);
  expect(mock.tracking).toHaveBeenCalledWith({ enabled: true });
  expect(container.querySelector("video")).toBe(mock.video.current);
  expect(screen.getByRole("heading", { name: "Let's get your hand ready" })).toBeTruthy();
  expect(screen.getByRole("status").textContent).toBe(STARTING_LINE);
  expect(mock.speak).toHaveBeenCalledWith(STARTING_LINE);
  expect(mock.unlock).toHaveBeenCalled();
  expect(screen.queryByTestId("scene")).toBeNull();
});

it("shows the lesson once the camera is ready and hands the scene its context", () => {
  mock.status = "ready";
  render(<HandActivityShell {...props()} />);
  expect(screen.getByRole("heading", { name: "Meet the neighbours" })).toBeTruthy();
  expect(screen.getByText("Point at each animal to learn about it.")).toBeTruthy();
  expect(screen.getByLabelText("1 of 4 discoveries")).toBeTruthy();
  expect(screen.getByText("Step 1 of 2")).toBeTruthy();
  expect(screen.getByTestId("scene")).toBeTruthy();
  expect(scene?.ready).toBe(true);
  expect(scene?.latest).toBe(mock.latest);
  expect(screen.getByRole("status").textContent).toBe("Point at the horse!");
});

it("shows what the hand is doing in the Your Hand card", () => {
  mock.status = "ready";
  render(<HandActivityShell {...props()} />);
  act(() => scene!.onHandStatus("Pinch an item to pick it up."));
  expect(screen.getByText("Pinch an item to pick it up.")).toBeTruthy();
});

it("speaks each new coach line once", () => {
  mock.status = "ready";
  const { rerender } = render(<HandActivityShell {...props()} />);
  mock.speak.mockClear();
  rerender(<HandActivityShell {...props({ coach: "Now let's match!" })} />);
  expect(mock.speak).toHaveBeenCalledWith("Now let's match!");
  mock.speak.mockClear();
  rerender(<HandActivityShell {...props({ coach: "Now let's match!" })} />);
  expect(mock.speak).not.toHaveBeenCalled();
});

it.each(["denied", "unavailable", "off"] as CameraStatus[])("offers adult help and Try again when the camera is %s", (status) => {
  mock.status = status;
  render(<HandActivityShell {...props()} />);
  expect(screen.getByRole("heading", { name: "Ask an adult to turn on the camera" })).toBeTruthy();
  expect(screen.getByRole("status").textContent).toBe(HELP_LINE);
  fireEvent.click(screen.getByRole("button", { name: "Try again" }));
  expect(mock.retry).toHaveBeenCalledTimes(1);
  expect(screen.queryByTestId("scene")).toBeNull();
});

it("leaves through the exit button", () => {
  const onExit = vi.fn();
  render(<HandActivityShell {...props({ onExit })} />);
  fireEvent.click(screen.getByRole("button", { name: "Back to Science Planet" }));
  expect(onExit).toHaveBeenCalledTimes(1);
});

it("leaves on Escape and traps focus when it manages focus", () => {
  const onExit = vi.fn();
  render(<HandActivityShell {...props({ onExit })} />);
  fireEvent.keyDown(document, { key: "Escape" });
  expect(onExit).toHaveBeenCalledTimes(1);
  expect(document.activeElement).toBe(screen.getByRole("button", { name: "Back to Science Planet" }));
});

it("leaves Escape and focus to the parent frame when manageFocus is false", () => {
  const onExit = vi.fn();
  render(<HandActivityShell {...props({ onExit, manageFocus: false })} />);
  fireEvent.keyDown(document, { key: "Escape" });
  expect(onExit).not.toHaveBeenCalled();
});
