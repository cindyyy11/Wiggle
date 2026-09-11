// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { useGestureControls } from "./useGestureControls";

const load = vi.hoisted(() => vi.fn());
vi.mock("./handLandmarker", () => ({ loadHandLandmarker: load }));
const tracker = { detect: vi.fn(() => null), close: vi.fn() };
const stop = vi.fn();
const stream = { getTracks: () => [{ stop }] } as unknown as MediaStream;
const camera = vi.fn();
function Harness({ enabled }: { enabled: boolean }) {
  const { video, status } = useGestureControls(enabled, vi.fn());
  return <><video ref={video} /><p>{status}</p></>;
}
beforeEach(() => {
  vi.clearAllMocks(); load.mockResolvedValue(tracker); camera.mockResolvedValue(stream);
  Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: { getUserMedia: camera } });
  vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
  vi.stubGlobal("requestAnimationFrame", vi.fn(() => 1));
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

it("loads only after consent entry, stops tracks and closes inference on mode exit", async () => {
  const view = render(<Harness enabled={false} />);
  expect(camera).not.toHaveBeenCalled(); expect(load).not.toHaveBeenCalled();
  view.rerender(<Harness enabled />);
  await screen.findByText("ready");
  expect(camera.mock.calls[0][0]).toMatchObject({ audio: false, video: { facingMode: "user" } });
  view.rerender(<Harness enabled={false} />);
  await screen.findByText("off");
  expect(stop).toHaveBeenCalledOnce(); expect(tracker.close).toHaveBeenCalledOnce();
  expect(view.container.querySelector("video")?.srcObject).toBeNull();
});

it("stops a camera grant that arrives after unmount without loading the model", async () => {
  let grant!: (stream: MediaStream) => void;
  camera.mockImplementation(() => new Promise(resolve => { grant = resolve; }));
  const view = render(<Harness enabled />); view.unmount();
  await act(async () => grant(stream));
  expect(stop).toHaveBeenCalledOnce(); expect(load).not.toHaveBeenCalled();
});

it("closes a model that finishes loading after cancellation", async () => {
  let ready!: (value: typeof tracker) => void;
  load.mockImplementation(() => new Promise(resolve => { ready = resolve; }));
  const view = render(<Harness enabled />);
  await waitFor(() => expect(load).toHaveBeenCalledOnce()); view.unmount();
  await act(async () => ready(tracker));
  expect(stop).toHaveBeenCalledOnce(); expect(tracker.close).toHaveBeenCalledOnce();
});

it("releases camera on model failure and page hide", async () => {
  load.mockRejectedValueOnce(new Error("Offline"));
  const first = render(<Harness enabled />);
  await screen.findByText("unavailable"); expect(stop).toHaveBeenCalledOnce(); first.unmount();
  render(<Harness enabled />); await screen.findByText("ready");
  act(() => window.dispatchEvent(new Event("pagehide")));
  expect(stop).toHaveBeenCalledTimes(2); expect(tracker.close).toHaveBeenCalledOnce();
});
