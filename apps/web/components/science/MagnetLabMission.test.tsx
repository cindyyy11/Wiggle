// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { MagnetLabMission } from "./MagnetLabMission";
import type { MagnetHandLabSceneProps } from "./MagnetHandLabScene";
import { MAGNET_OBJECTS } from "./scienceWorld";
import type { CameraStatus } from "../../features/gestures/useHandTracking";

const mock = vi.hoisted(() => ({ status: "starting" as CameraStatus, retry: vi.fn(), tracking: vi.fn(), scene: null as MagnetHandLabSceneProps | null, video: { current: null } }));
vi.mock("../../features/gestures/useHandTracking", () => ({ useHandTracking: (options: unknown) => {
  mock.tracking(options);
  return { status: mock.status, video: mock.video, retry: mock.retry, latest: { current: { isTracking: false } } };
} }));
vi.mock("./MagnetHandLabScene", () => ({ MagnetHandLabScene: (props: MagnetHandLabSceneProps) => { mock.scene = props; return <div data-testid="scene" />; } }));
beforeEach(() => { mock.status = "starting"; mock.scene = null; vi.clearAllMocks(); });
afterEach(cleanup);

it("enables tracking immediately and mounts the video during startup", () => {
  const { container } = render(<MagnetLabMission onExit={vi.fn()} onComplete={vi.fn()} />);
  expect(mock.tracking).toHaveBeenCalledWith({ enabled: true });
  expect(container.querySelector("video")).toBe(mock.video.current);
  expect(screen.getByRole("status").textContent).toContain("Starting your camera");
  expect(screen.queryByRole("button", { name: /Use hand gestures|Try the magnet|Test |^Attracted$|^Not attracted$/i })).toBeNull();
});
it.each(["denied", "unavailable", "off"] as CameraStatus[])("offers adult help and retry for %s", (status) => {
  mock.status = status;
  const onExit = vi.fn();
  render(<MagnetLabMission onExit={onExit} onComplete={vi.fn()} />);
  expect(screen.getByRole("heading", { name: "Ask an adult to turn on the camera" })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Try again" }));
  expect(mock.retry).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole("button", { name: "Back to Science Planet" }));
  expect(onExit).toHaveBeenCalledTimes(1);
});
it("keeps the video element across status changes and shows the ready mission", () => {
  const { container, rerender } = render(<MagnetLabMission onExit={vi.fn()} onComplete={vi.fn()} />);
  const video = container.querySelector("video");
  mock.status = "ready";
  rerender(<MagnetLabMission onExit={vi.fn()} onComplete={vi.fn()} />);
  expect(container.querySelector("video")).toBe(video);
  expect(screen.getByText("Move your open hand to guide the magnet!")).toBeTruthy();
  expect(screen.getByText("Your Hand")).toBeTruthy();
});
it("traps focus, exits on Escape, and restores the previous start control", () => {
  const start = document.createElement("button"); start.textContent = "Start Magnet Lab"; document.body.append(start); start.focus();
  const onExit = vi.fn();
  const { unmount } = render(<MagnetLabMission onExit={onExit} onComplete={vi.fn()} />);
  const back = screen.getByRole("button", { name: "Back to Science Planet" });
  expect(document.activeElement).toBe(back);
  fireEvent.keyDown(back, { key: "Tab", shiftKey: true });
  expect(document.activeElement).toBe(back);
  fireEvent.keyDown(back, { key: "Escape" });
  expect(onExit).toHaveBeenCalledTimes(1);
  unmount(); expect(document.activeElement).toBe(start); start.remove();
});
it("restores focus to a remounted start control", async () => {
  const { rerender } = render(<button>Start Magnet Lab</button>);
  screen.getByRole("button").focus();
  rerender(<MagnetLabMission onExit={vi.fn()} onComplete={vi.fn()} />);
  rerender(<button>Start Magnet Lab</button>);
  await act(async () => {});
  expect(document.activeElement).toBe(screen.getByRole("button", { name: "Start Magnet Lab" }));
});
it("advances through reducer actions and completes exactly once", () => {
  mock.status = "ready";
  const onComplete = vi.fn();
  render(<MagnetLabMission onExit={vi.fn()} onComplete={onComplete} />);
  for (const object of MAGNET_OBJECTS) act(() => mock.scene!.onAction({ type: "observe", id: object.id }));
  expect(screen.getByText("Pinch an object, move it to a tray, then open your hand.")).toBeTruthy();
  for (const object of MAGNET_OBJECTS) {
    act(() => mock.scene!.onAction({ type: "grab", id: object.id }));
    act(() => mock.scene!.onAction({ type: "drop", id: object.id, target: object.result }));
  }
  expect(screen.getByText("Point around the campsite to find the hidden magnet.")).toBeTruthy();
  expect(onComplete).not.toHaveBeenCalled();
  act(() => mock.scene!.onAction({ type: "investigate", target: "toolbox" }));
  act(() => mock.scene!.onAction({ type: "investigate", target: "toolbox" }));
  expect(onComplete).toHaveBeenCalledTimes(1);
});
it("keeps navigation available when graphics fail", () => {
  mock.status = "ready";
  render(<MagnetLabMission onExit={vi.fn()} onComplete={vi.fn()} />);
  act(() => mock.scene!.onHandStatus("The lab view needs a graphics-capable device."));
  expect(screen.getByRole("status").textContent).toContain("graphics-capable");
  expect(screen.getByRole("button", { name: "Back to Science Planet" })).toBeTruthy();
});
