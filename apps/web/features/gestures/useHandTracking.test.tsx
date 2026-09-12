// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { useHandTracking } from "./useHandTracking";

const load = vi.hoisted(() => vi.fn());
vi.mock("./handLandmarker", () => ({ loadHandLandmarker: load }));
const tracker = { detect: vi.fn(() => null), close: vi.fn() };
const stop = vi.fn();
const stream = { getTracks: () => [{ stop }] } as unknown as MediaStream;
const camera = vi.fn();

function Harness({ enabled }: { enabled: boolean }) {
  const tracking = useHandTracking({ enabled });
  return <><video ref={tracking.video} /><p>{tracking.status}</p></>;
}
beforeEach(() => {
  vi.clearAllMocks(); load.mockResolvedValue(tracker); camera.mockResolvedValue(stream);
  Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: { getUserMedia: camera } });
  vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
  vi.stubGlobal("requestAnimationFrame", vi.fn(() => 1)); vi.stubGlobal("cancelAnimationFrame", vi.fn());
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
