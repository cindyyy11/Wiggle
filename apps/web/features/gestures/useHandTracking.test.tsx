// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import type { HandFrame } from "./gestureClassifier";
import type { LocalHandTracker } from "./handLandmarker";
import { useHandTracking } from "./useHandTracking";

const load = vi.hoisted(() => vi.fn());
vi.mock("./handLandmarker", () => ({ loadHandLandmarker: load }));
const tracker = {
  detect: vi.fn<(video: HTMLVideoElement, time: number) => HandFrame | null>(() => null),
  close: vi.fn(),
} satisfies LocalHandTracker;
const stop = vi.fn();
const stream = { getTracks: () => [{ stop }] } as unknown as MediaStream;
const camera = vi.fn();

function Harness({ enabled, onTracking, onGestureStart }: { enabled: boolean; onTracking?: (tracking: ReturnType<typeof useHandTracking>) => void; onGestureStart?: () => void }) {
  const tracking = useHandTracking({ enabled, onGestureStart });
  onTracking?.(tracking);
  return <><video ref={tracking.video} /><p>{tracking.status}</p></>;
}
const landmarks = Array.from({ length: 21 }, () => ({ x: .5, y: .7, z: 0 }));
landmarks[0] = { x: .5, y: .9, z: 0 };
for (const [base, x, extended] of [[5, .4, true], [9, .5, true], [13, .6, false], [17, .7, false]] as const) {
  landmarks[base] = { x, y: .6, z: 0 };
  landmarks[base + 1] = { x, y: .45, z: 0 };
  landmarks[base + 2] = { x, y: extended ? .3 : .6, z: 0 };
  landmarks[base + 3] = { x, y: extended ? .15 : .75, z: 0 };
}
landmarks[4] = { x: .15, y: .65, z: 0 };
const unclassifiedFrame = { landmarks, pointer: { x: 0.2, y: 0.6, z: 0 }, handedness: "Right", confidence: .98 };
let animationFrame: FrameRequestCallback | undefined;
beforeEach(() => {
  vi.clearAllMocks(); load.mockResolvedValue(tracker); camera.mockResolvedValue(stream);
  Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: { getUserMedia: camera } });
  vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
  Object.defineProperty(HTMLMediaElement.prototype, "readyState", { configurable: true, get: () => 2 });
  animationFrame = undefined;
  vi.stubGlobal("requestAnimationFrame", vi.fn(callback => { animationFrame = callback; return 1; })); vi.stubGlobal("cancelAnimationFrame", vi.fn());
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

it("starts only when enabled and releases local camera/model resources on exit", async () => {
  const view = render(<Harness enabled={false} />);
  expect(camera).not.toHaveBeenCalled(); expect(load).not.toHaveBeenCalled();
  view.rerender(<Harness enabled />);
  await screen.findByText("ready");
  expect(camera).toHaveBeenCalledWith(expect.objectContaining({ audio: false }));
  view.rerender(<Harness enabled={false} />);
  await screen.findByText("off");
  expect(stop).toHaveBeenCalledOnce(); expect(tracker.close).toHaveBeenCalledOnce();
});

it("closes a late model result after unmount", async () => {
  let resolve!: (value: typeof tracker) => void;
  load.mockImplementation(() => new Promise<typeof tracker>(done => { resolve = done; }));
  const view = render(<Harness enabled />);
  await vi.waitFor(() => expect(load).toHaveBeenCalledOnce());
  view.unmount(); resolve(tracker);
  await vi.waitFor(() => expect(tracker.close).toHaveBeenCalledOnce());
});

it("publishes a confident pointer even when its hand is not a gesture", async () => {
  tracker.detect.mockReturnValue(unclassifiedFrame);
  let current!: ReturnType<typeof useHandTracking>;
  const onGestureStart = vi.fn();
  render(<Harness enabled onTracking={tracking => { current = tracking; }} onGestureStart={onGestureStart} />);
  await screen.findByText("ready");
  act(() => animationFrame?.(100));
  expect(current.latest.current.isTracking).toBe(true);
  expect(current.latest.current.pointer).toMatchObject({ x: 0.6, y: expect.closeTo(-0.2, 10) });
  expect(current.latest.current.gesture).toBeNull();
  expect(onGestureStart).not.toHaveBeenCalled();
});

it("reports permission denial and retries camera startup", async () => {
  camera.mockRejectedValueOnce(new DOMException("Denied", "NotAllowedError"));
  let current!: ReturnType<typeof useHandTracking>;
  render(<Harness enabled onTracking={tracking => { current = tracking; }} />);
  await screen.findByText("denied");
  act(() => current.retry());
  await screen.findByText("ready");
  expect(camera).toHaveBeenCalledTimes(2);
});

it("reports a SecurityError as denied", async () => {
  camera.mockRejectedValueOnce(new DOMException("Blocked by policy", "SecurityError"));
  render(<Harness enabled />);
  await screen.findByText("denied");
});

it("reports other camera failures as unavailable", async () => {
  camera.mockRejectedValueOnce(new Error("No camera"));
  render(<Harness enabled />);
  await screen.findByText("unavailable");
});

it("does not publish low-confidence or malformed pointers", async () => {
  let current!: ReturnType<typeof useHandTracking>;
  render(<Harness enabled onTracking={tracking => { current = tracking; }} />);
  await screen.findByText("ready");
  tracker.detect.mockReturnValue({ ...unclassifiedFrame, confidence: .59 });
  act(() => animationFrame?.(100));
  expect(current.latest.current.pointer).toBeNull();
  expect(current.latest.current.isTracking).toBe(false);
  tracker.detect.mockReturnValue({ ...unclassifiedFrame, pointer: { x: Number.NaN, y: 0.6, z: 0 } });
  act(() => animationFrame?.(200));
  expect(current.latest.current.pointer).toBeNull();
  expect(current.latest.current.isTracking).toBe(false);
});

it("releases local resources and clears the latest frame on pagehide", async () => {
  tracker.detect.mockReturnValue(unclassifiedFrame);
  let current!: ReturnType<typeof useHandTracking>;
  const view = render(<Harness enabled onTracking={tracking => { current = tracking; }} />);
  await screen.findByText("ready");
  act(() => animationFrame?.(100));
  const video = view.container.querySelector("video")!;
  expect(video.srcObject).toBe(stream);
  expect(current.latest.current.pointer).not.toBeNull();
  act(() => window.dispatchEvent(new Event("pagehide")));
  expect(stop).toHaveBeenCalledOnce();
  expect(tracker.close).toHaveBeenCalledOnce();
  expect(video.srcObject).toBeNull();
  expect(current.latest.current).toEqual({ pointer: null, gesture: null, handedness: null, confidence: 0, isTracking: false });
});
