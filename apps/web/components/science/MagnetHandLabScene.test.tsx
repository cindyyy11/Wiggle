// @vitest-environment jsdom
import React from "react";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { HandTrackingLatest } from "../../features/gestures/useHandTracking";
import { initialMagnetPlay } from "./magnetHandPlay";
import { MagnetHandLabScene, observationActionForTablePoint } from "./MagnetHandLabScene";

const canvasState = vi.hoisted(() => ({ throwOnRender: false }));
const webgl = vi.hoisted(() => ({ supported: true, probeCalls: 0 }));

vi.mock("@react-three/fiber", () => ({
  // Keep R3F internals out of jsdom; interaction rules are tested through the pure adapter below.
  Canvas: ({ children: _children, ...props }: React.HTMLAttributes<HTMLDivElement> & { children: React.ReactNode }) => {
    if (canvasState.throwOnRender) throw new Error("Magnet Lab scene renderer failed");
    return <div {...props} />;
  },
}));

beforeEach(() => {
  canvasState.throwOnRender = false;
  webgl.supported = true;
  webgl.probeCalls = 0;
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(() => {
    webgl.probeCalls++;
    return webgl.supported ? { getExtension: () => ({ loseContext: vi.fn() }) } as never : null;
  });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

const latest = {
  current: {
    pointer: { x: -0.65, y: -0.5 },
    gesture: null,
    handedness: "Right",
    confidence: .95,
    isTracking: true,
  },
} as React.RefObject<HandTrackingLatest>;

it("renders a labelled decorative workbench for every checkpoint", async () => {
  const onAction = vi.fn();
  const onHandStatus = vi.fn();
  const { rerender } = render(
    <MagnetHandLabScene latest={latest} state={initialMagnetPlay} reducedMotion={false} onAction={onAction} onHandStatus={onHandStatus} />,
  );

  expect(await screen.findByLabelText("Magnet Lab workbench")).toBeTruthy();
  expect(screen.getByLabelText("Magnet Lab workbench").getAttribute("aria-hidden")).toBe("true");

  rerender(<MagnetHandLabScene latest={latest} state={{ ...initialMagnetPlay, checkpoint: "sort", explored: ["paper-clip", "iron-nail", "wooden-block", "plastic-button"] }} reducedMotion={false} onAction={onAction} onHandStatus={onHandStatus} />);
  expect(screen.getByLabelText("Magnet Lab workbench")).toBeTruthy();

  rerender(<MagnetHandLabScene latest={latest} state={{ ...initialMagnetPlay, checkpoint: "hidden", foundHiddenMagnet: false }} reducedMotion={true} onAction={onAction} onHandStatus={onHandStatus} />);
  expect(screen.getByLabelText("Magnet Lab workbench")).toBeTruthy();
});

it("returns a deterministic first observation from the table interaction adapter", () => {
  expect(observationActionForTablePoint(initialMagnetPlay, { x: .22, y: .28 })).toEqual({ type: "observe", id: "paper-clip" });
  expect(observationActionForTablePoint({ ...initialMagnetPlay, explored: ["paper-clip"] }, { x: .22, y: .28 })).toBeNull();
});

it("reports a graphics failure exactly once without announcing one for a healthy Canvas", async () => {
  const healthyStatus = vi.fn();
  render(<MagnetHandLabScene latest={latest} state={initialMagnetPlay} reducedMotion={false} onAction={vi.fn()} onHandStatus={healthyStatus} />);
  await screen.findByLabelText("Magnet Lab workbench");
  expect(healthyStatus).not.toHaveBeenCalledWith("The lab view needs a graphics-capable device.");

  cleanup();
  canvasState.throwOnRender = true;
  const failedStatus = vi.fn();
  const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
  render(<MagnetHandLabScene latest={latest} state={initialMagnetPlay} reducedMotion={false} onAction={vi.fn()} onHandStatus={failedStatus} />);

  await waitFor(() => expect(failedStatus).toHaveBeenCalledTimes(1));
  expect(screen.queryByLabelText("Magnet Lab workbench")).toBeNull();
  expect(failedStatus).toHaveBeenCalledWith("The lab view needs a graphics-capable device.");
  consoleError.mockRestore();
});

it("reports a WebGL capability preflight failure once and never mounts Canvas", async () => {
  webgl.supported = false;
  const onHandStatus = vi.fn();
  render(<MagnetHandLabScene latest={latest} state={initialMagnetPlay} reducedMotion={false} onAction={vi.fn()} onHandStatus={onHandStatus} />);

  await waitFor(() => expect(onHandStatus).toHaveBeenCalledTimes(1));
  expect(webgl.probeCalls).toBe(1);
  expect(screen.queryByLabelText("Magnet Lab workbench")).toBeNull();
  expect(onHandStatus).toHaveBeenCalledWith("The lab view needs a graphics-capable device.");
});
