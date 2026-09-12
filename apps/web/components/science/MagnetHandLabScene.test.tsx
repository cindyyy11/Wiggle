// @vitest-environment jsdom
import React from "react";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { HandTrackingLatest } from "../../features/gestures/useHandTracking";
import { initialMagnetPlay, magnetPlayReducer, type MagnetPlayState } from "./magnetHandPlay";
import { MagnetHandGestureController } from "./magnetHandGesture";
import { MAGNET_OBJECTS } from "./scienceWorld";
import { MagnetHandLabScene, observationActionForTablePoint, actionForHandFrame, handStatusForFrame } from "./MagnetHandLabScene";

const canvasState = vi.hoisted(() => ({ throwOnRender: false }));
const webgl = vi.hoisted(() => ({ supported: true, cleanupThrows: false, probeCalls: 0 }));
const getContextMock = vi.hoisted(() => vi.fn());

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
  webgl.cleanupThrows = false;
  webgl.probeCalls = 0;
  getContextMock.mockReset();
  getContextMock.mockImplementation(() => {
    webgl.probeCalls++;
    return webgl.supported ? {
      getExtension: () => ({ loseContext: () => {
        if (webgl.cleanupThrows) throw new Error("Unable to release probe context");
      } }),
    } as never : null;
  });
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(getContextMock);
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

it("rejects stale, missing, low-confidence and non-finite pointers for every checkpoint", () => {
  for (const invalid of [
    { isTracking: false }, { pointer: null }, { confidence: .1 },
    { pointer: { x: NaN, y: 0 } }, { pointer: { x: 0, y: Infinity } },
  ]) {
    for (const checkpoint of ["explore", "sort", "hidden"] as const) {
      const frame = { ...latest.current, gesture: "point" as const, ...invalid };
      expect(actionForHandFrame({ ...initialMagnetPlay, checkpoint }, frame, new MagnetHandGestureController(), 0)).toBeNull();
    }
  }
});

it("asks for a hand when the tracked table point is low-confidence or non-finite", () => {
  const prompt = "Show your hand to the camera to use the Magnet Lab workbench.";
  expect(handStatusForFrame("sort", { ...latest.current, confidence: .1 })).toBe(prompt);
  expect(handStatusForFrame("sort", { ...latest.current, pointer: { x: NaN, y: 0 } })).toBe(prompt);
  expect(handStatusForFrame("sort", latest.current)).toBe("Pinch an object, then open your hand over the matching tray.");
});
it("names the nearby object and whether it pulls during explore", () => {
  const [x, y] = MAGNET_OBJECTS[0].scenePosition;
  const frame = { ...latest.current, pointer: { x: (x - .5) / .43, y: (y - .5) / .43 } };
  expect(handStatusForFrame("explore", frame)).toContain("paper clip");
  expect(handStatusForFrame("explore", frame)).toContain("sticks");
});

it("cancels a lost grab without scoring and accepts a new object after reacquisition", () => {
  const controller = new MagnetHandGestureController();
  let state: MagnetPlayState = { ...initialMagnetPlay, checkpoint: "sort" };
  const [x, y] = MAGNET_OBJECTS[0].scenePosition;
  const frame = { ...latest.current, pointer: { x: (x - .5) / .43, y: (y - .5) / .43 }, gesture: "pinch" as const };
  const grab = actionForHandFrame(state, frame, controller, 0)!;
  expect(grab).toEqual({ type: "grab", id: "paper-clip" });
  state = magnetPlayReducer(state, grab);
  const lost = { ...frame, isTracking: false, gesture: "open_palm" as const };
  expect(actionForHandFrame(state, lost, controller, 100)).toBeNull();
  const cancel = actionForHandFrame(state, lost, controller, 501)!;
  expect(cancel).toEqual({ type: "cancel", id: "paper-clip" });
  state = magnetPlayReducer(state, cancel);
  expect(state.held).toBeNull();
  expect(state.sorted).toEqual([]);
  expect(state.foundHiddenMagnet).toBe(false);
  const again = actionForHandFrame(state, frame, controller, 600)!;
  expect(magnetPlayReducer(state, again).held).toBe("paper-clip");
});

it("completes all checkpoints from deterministic confident hand frames", () => {
  const controller = new MagnetHandGestureController();
  let state = initialMagnetPlay;
  let at = 0;
  const move = (x: number, y: number, gesture: HandTrackingLatest["gesture"]) => {
    const frame = { ...latest.current, pointer: { x: (x - .5) / .43, y: (y - .5) / .43 }, gesture };
    const action = actionForHandFrame(state, frame, controller, at += 100);
    if (action) state = magnetPlayReducer(state, action);
  };
  for (const object of MAGNET_OBJECTS) move(object.scenePosition[0], object.scenePosition[1], "open_palm");
  expect(state.checkpoint).toBe("sort");
  for (const object of MAGNET_OBJECTS) {
    move(object.scenePosition[0], object.scenePosition[1], "pinch");
    move(object.result === "attracted" ? .25 : .75, .08, "open_palm");
  }
  expect(state.checkpoint).toBe("hidden");
  expect(state.sorted).toHaveLength(4);
  move(.5, .54, "point");
  expect(state.foundHiddenMagnet).toBe(true);
});

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
  expect(observationActionForTablePoint(initialMagnetPlay, { x: MAGNET_OBJECTS[0].scenePosition[0], y: MAGNET_OBJECTS[0].scenePosition[1] })).toEqual({ type: "observe", id: "paper-clip" });
  expect(observationActionForTablePoint({ ...initialMagnetPlay, explored: ["paper-clip"] }, { x: MAGNET_OBJECTS[0].scenePosition[0], y: MAGNET_OBJECTS[0].scenePosition[1] })).toBeNull();
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

it("treats a throwing WebGL probe cleanup as unsupported", async () => {
  webgl.cleanupThrows = true;
  const onHandStatus = vi.fn();
  render(<MagnetHandLabScene latest={latest} state={initialMagnetPlay} reducedMotion={false} onAction={vi.fn()} onHandStatus={onHandStatus} />);

  await waitFor(() => expect(onHandStatus).toHaveBeenCalledTimes(1));
  expect(getContextMock).toHaveBeenCalledWith("webgl2", { failIfMajorPerformanceCaveat: true });
  expect(screen.queryByLabelText("Magnet Lab workbench")).toBeNull();
  expect(onHandStatus).toHaveBeenCalledWith("The lab view needs a graphics-capable device.");
});
