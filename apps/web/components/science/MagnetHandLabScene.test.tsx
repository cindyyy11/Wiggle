// @vitest-environment jsdom
import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { HandTrackingLatest } from "../../features/gestures/useHandTracking";
import { initialMagnetPlay } from "./magnetHandPlay";
import { MagnetHandLabScene, observationActionForTablePoint } from "./MagnetHandLabScene";

const canvasState = vi.hoisted(() => ({ throwOnRender: false }));

vi.mock("@react-three/fiber", () => ({
  // Keep R3F internals out of jsdom; interaction rules are tested through the pure adapter below.
  Canvas: ({ children: _children, ...props }: React.HTMLAttributes<HTMLDivElement> & { children: React.ReactNode }) => {
    if (canvasState.throwOnRender) throw new Error("Magnet Lab scene renderer failed");
    return <div {...props} />;
  },
}));

beforeEach(() => { canvasState.throwOnRender = false; });
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

it("renders a labelled decorative workbench for every checkpoint", () => {
  const onAction = vi.fn();
  const onHandStatus = vi.fn();
  const { rerender } = render(
    <MagnetHandLabScene latest={latest} state={initialMagnetPlay} reducedMotion={false} onAction={onAction} onHandStatus={onHandStatus} />,
  );

  expect(screen.getByLabelText("Magnet Lab workbench")).toBeTruthy();
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

it("reports a graphics failure exactly once without announcing one for a healthy Canvas", () => {
  const healthyStatus = vi.fn();
  render(<MagnetHandLabScene latest={latest} state={initialMagnetPlay} reducedMotion={false} onAction={vi.fn()} onHandStatus={healthyStatus} />);
  expect(healthyStatus).not.toHaveBeenCalledWith("The lab view needs a graphics-capable device.");

  cleanup();
  canvasState.throwOnRender = true;
  const failedStatus = vi.fn();
  const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
  render(<MagnetHandLabScene latest={latest} state={initialMagnetPlay} reducedMotion={false} onAction={vi.fn()} onHandStatus={failedStatus} />);

  expect(screen.queryByLabelText("Magnet Lab workbench")).toBeNull();
  expect(failedStatus).toHaveBeenCalledTimes(1);
  expect(failedStatus).toHaveBeenCalledWith("The lab view needs a graphics-capable device.");
  consoleError.mockRestore();
});
