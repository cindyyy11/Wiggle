# Camera-First Science Lands Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Animal Types, Colors Canyon and Life Cycle Garden play like Magnet Lands: the camera opens on entry and the activity is played only with the hand, on a custom 3D workbench per land.

**Architecture:** A shared camera-first frame (`HandActivityShell`, lifted from Magnet Lab), a pure hand-play engine (`handBenchPlay` + `HandBenchController`), one shared React Three Fiber bench scene (`HandBenchScene`), and one self-contained 3D set per land. `ScienceHandSession` wires them together from the existing `SCIENCE_ACTIVITIES` data and replaces `ScienceStarterSession` in the Science Planet.

**Tech Stack:** Next.js 15 / React 19, TypeScript, React Three Fiber + three, Vitest (jsdom), Playwright, CSS Modules. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-09-21-camera-first-science-lands-design.md`

## Global Constraints

- Camera required. If it cannot open (denied, unavailable, none) show the Magnet-style "Ask an adult to turn on the camera" screen with **Try again**. There is no button or keyboard fallback for the activity itself.
- Camera frames and inference stay on the device. No new services, uploads or dependencies.
- The existing `SCIENCE_ACTIVITIES` items, facts, targets and `matchesActivity` rules are unchanged and stay the source of truth.
- Magnet Lands (`MagnetLabMission`, `MagnetHandLabScene`, `magnetHandPlay`) is not modified.
- Losing hand tracking for 400 ms (`GESTURE_CONFIG.lostHandGraceMs`) returns a held item to the bench and never scores an answer or releases one onto a target.
- Reduced motion tones down bounce, shake and sparkle animations; the activity stays hand-controlled.
- Escape and the exit button work, and focus returns to the entry control. No horizontal scroll at 390 px.
- Commit messages use conventional prefixes and carry **no** `Co-Authored-By` or Claude trailers.
- All commands run from `apps/web` unless stated. Unit tests: `npx vitest run <file>`. Typecheck: `npx tsc --noEmit`. Lint: `npx eslint <paths>`.
- The machine is memory-tight: build with `NODE_OPTIONS=--max-old-space-size=2048 npm run build --workspace=@wiggle/web` from the repo root, and run browser specs in small batches. Playwright serves the existing `.next` build and never rebuilds, so rebuild before browser runs.

---

## File Structure

| File | Responsibility |
| --- | --- |
| `apps/web/components/handActivity/handBenchPlay.ts` | Pure engine: bench types, pointer to bench mapping, hit-testing, reducer over `{ phase, observed, matched, held }`. |
| `apps/web/components/handActivity/handBenchController.ts` | Pure gesture controller (point, pinch, open palm, 400 ms loss grace) that emits `BenchAction`s. |
| `apps/web/components/handActivity/handBenchFrame.ts` | Pure adapters from a hand-tracking frame: `trackedBenchPoint`, `benchStatusForFrame`. |
| `apps/web/components/handActivity/HandActivityShell.tsx` | The frame: starts the camera, backdrop, mission card, guide bubble, "Your Hand" card, adult-help screen, focus and Escape. |
| `apps/web/components/handActivity/benchSet.ts` | Types for a land's 3D set (`BenchSet`, item and target descriptors). |
| `apps/web/components/handActivity/HandBenchScene.tsx` | Shared R3F scene: bench, hand cursor, held item, hover, shake, sparkle. |
| `apps/web/components/handActivity/sets/setParts.tsx` | Shared 3D pieces: `Lift`, `PadFrame`, `Bench`. |
| `apps/web/components/handActivity/sets/AnimalSet.tsx` | Animal Types 3D set. |
| `apps/web/components/handActivity/sets/ColorSet.tsx` | Colors Canyon 3D set. |
| `apps/web/components/handActivity/sets/LifeCycleSet.tsx` | Life Cycle Garden 3D set. |
| `apps/web/components/handActivity/sets/index.ts` | `BENCH_SETS` registry keyed by land id. |
| `apps/web/components/science/ScienceHandSession.tsx` | Wires shell, scene and engine for one land; keeps the `StarterProgress` contract. |
| `apps/web/components/science/SciencePlanetCanvas.tsx` | Modified: opens `ScienceHandSession` for the three lands. |
| `apps/web/components/science/scienceActivities.ts` | Modified: gains `StarterProgress`; loses `StarterHandController`. |

Removed in Task 6: `ScienceStarterSession.tsx`, `ScienceStarterSession.test.tsx`, `ScienceActivityModels.tsx`.

---

### Task 1: Pure hand-play engine

**Files:**
- Create: `apps/web/components/handActivity/handBenchPlay.ts`
- Test: `apps/web/components/handActivity/handBenchPlay.test.ts`

**Interfaces:**
- Consumes: `PointerNdc` from `../../features/gestures/handMath` (`{ x: number; y: number }`, camera NDC, y up).
- Produces: types `BenchPoint`, `BenchZone`, `BenchPhase`, `BenchState`, `BenchRules`, `BenchAction`; `initialBenchState`; `handPointerToBench(pointer): BenchPoint`; `benchHit(point, zones): string | null`; `benchReducer(rules, state, action): BenchState`.

- [ ] **Step 1: Write the failing test**

Create `apps/web/components/handActivity/handBenchPlay.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  benchHit,
  benchReducer,
  handPointerToBench,
  initialBenchState,
  type BenchAction,
  type BenchRules,
  type BenchState,
} from "./handBenchPlay";

const rules: BenchRules = {
  itemIds: ["a", "b"],
  targetFor: (id) => ({ a: "left", b: "right" } as Record<string, string>)[id],
};
const run = (state: BenchState, ...actions: BenchAction[]) =>
  actions.reduce((next, action) => benchReducer(rules, next, action), state);
const inMatch = () => run(initialBenchState, { type: "observe", id: "a" }, { type: "observe", id: "b" }, { type: "advance" });

describe("handPointerToBench", () => {
  it("centres a centred hand and pads the edges", () => {
    expect(handPointerToBench({ x: 0, y: 0 })).toEqual({ x: .5, y: .5 });
    expect(handPointerToBench({ x: 1, y: 1 })).toEqual({ x: .93, y: .93 });
    expect(handPointerToBench({ x: -1, y: -1 })).toEqual({ x: .07, y: .07 });
  });

  it("keeps outliers on the bench", () => {
    expect(handPointerToBench({ x: 9, y: -9 })).toEqual({ x: 1, y: 0 });
  });
});

describe("benchHit", () => {
  const zones = [
    { id: "near", at: { x: .5, y: .5 }, radius: .1 },
    { id: "far", at: { x: .9, y: .9 }, radius: .1 },
  ];

  it("returns the zone the point is inside", () => {
    expect(benchHit({ x: .52, y: .5 }, zones)).toBe("near");
    expect(benchHit({ x: .9, y: .85 }, zones)).toBe("far");
  });

  it("returns null when the point is in no zone", () => {
    expect(benchHit({ x: .2, y: .2 }, zones)).toBeNull();
  });

  it("prefers the nearest zone when two overlap", () => {
    const overlapping = [
      { id: "a", at: { x: .5, y: .5 }, radius: .2 },
      { id: "b", at: { x: .6, y: .5 }, radius: .2 },
    ];
    expect(benchHit({ x: .58, y: .5 }, overlapping)).toBe("b");
  });
});

describe("benchReducer", () => {
  it("records each discovery once and ignores unknown items", () => {
    const once = run(initialBenchState, { type: "observe", id: "a" });
    expect(once.observed).toEqual(["a"]);
    expect(run(once, { type: "observe", id: "a" })).toBe(once);
    expect(run(once, { type: "observe", id: "zzz" })).toBe(once);
  });

  it("only advances to matching once everything has been discovered", () => {
    const partway = run(initialBenchState, { type: "observe", id: "a" });
    expect(run(partway, { type: "advance" }).phase).toBe("discover");
    expect(inMatch().phase).toBe("match");
  });

  it("does not let a child grab or discover in the wrong phase", () => {
    expect(run(initialBenchState, { type: "grab", id: "a" }).held).toBeNull();
    expect(run(inMatch(), { type: "observe", id: "a" }).phase).toBe("match");
    expect(run(inMatch(), { type: "observe", id: "a" }).observed).toEqual(["a", "b"]);
  });

  it("holds one item at a time", () => {
    const holding = run(inMatch(), { type: "grab", id: "a" });
    expect(holding.held).toBe("a");
    expect(run(holding, { type: "grab", id: "b" }).held).toBe("a");
  });

  it("scores a correct drop and keeps the phase until the last one", () => {
    const state = run(inMatch(), { type: "grab", id: "a" }, { type: "drop", id: "a", target: "left" });
    expect(state.matched).toEqual(["a"]);
    expect(state.held).toBeNull();
    expect(state.phase).toBe("match");
  });

  it("scores nothing on a wrong drop but lets go of the item", () => {
    const state = run(inMatch(), { type: "grab", id: "a" }, { type: "drop", id: "a", target: "right" });
    expect(state.matched).toEqual([]);
    expect(state.held).toBeNull();
  });

  it("finishes when every item is matched", () => {
    const done = run(
      inMatch(),
      { type: "grab", id: "a" }, { type: "drop", id: "a", target: "left" },
      { type: "grab", id: "b" }, { type: "drop", id: "b", target: "right" },
    );
    expect(done.phase).toBe("done");
    expect(done.matched).toEqual(["a", "b"]);
  });

  it("cannot grab an item that is already matched", () => {
    const state = run(inMatch(), { type: "grab", id: "a" }, { type: "drop", id: "a", target: "left" });
    expect(run(state, { type: "grab", id: "a" }).held).toBeNull();
  });

  it("ignores a drop of something that is not being held", () => {
    const state = run(inMatch(), { type: "grab", id: "a" });
    expect(run(state, { type: "drop", id: "b", target: "right" })).toBe(state);
  });

  it("cancel releases only the item that is held", () => {
    const holding = run(inMatch(), { type: "grab", id: "a" });
    expect(run(holding, { type: "cancel", id: "b" })).toBe(holding);
    expect(run(holding, { type: "cancel", id: "a" }).held).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run components/handActivity/handBenchPlay.test.ts`
Expected: FAIL, `Failed to resolve import "./handBenchPlay"`.

- [ ] **Step 3: Write minimal implementation**

Create `apps/web/components/handActivity/handBenchPlay.ts`:

```ts
import type { PointerNdc } from "../../features/gestures/handMath";

export type BenchPoint = { x: number; y: number };
/** A circular hit area on the bench, in bench coordinates (0 to 1 on both axes, y up). */
export type BenchZone = { id: string; at: BenchPoint; radius: number };
export type BenchPhase = "discover" | "match" | "done";
export type BenchState = { phase: BenchPhase; observed: string[]; matched: string[]; held: string | null };
export type BenchRules = { itemIds: readonly string[]; targetFor(itemId: string): string | undefined };
export type BenchAction =
  | { type: "observe"; id: string }
  | { type: "advance" }
  | { type: "grab"; id: string }
  | { type: "drop"; id: string; target: string }
  | { type: "cancel"; id: string };

export const initialBenchState: BenchState = { phase: "discover", observed: [], matched: [], held: null };

const BENCH_MARGIN = .07;
const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
const round = (value: number) => Number(clamp01(value).toFixed(4));

/** Maps mirrored camera NDC onto the padded bench while keeping outliers on it. */
export function handPointerToBench(pointer: PointerNdc): BenchPoint {
  const usableRange = 1 - BENCH_MARGIN * 2;
  return { x: round(.5 + pointer.x * usableRange / 2), y: round(.5 + pointer.y * usableRange / 2) };
}

/** The id of the nearest zone containing the point, or null. */
export function benchHit(point: BenchPoint, zones: readonly BenchZone[]): string | null {
  let best: string | null = null;
  let bestDistance = Infinity;
  for (const zone of zones) {
    const distance = Math.hypot(point.x - zone.at.x, point.y - zone.at.y);
    if (distance <= zone.radius && distance < bestDistance) { best = zone.id; bestDistance = distance; }
  }
  return best;
}

/** Immutable lesson state: discover every item, then match each to its target. */
export function benchReducer(rules: BenchRules, state: BenchState, action: BenchAction): BenchState {
  switch (action.type) {
    case "observe":
      if (state.phase !== "discover" || state.observed.includes(action.id) || !rules.itemIds.includes(action.id)) return state;
      return { ...state, observed: [...state.observed, action.id] };
    case "advance":
      if (state.phase !== "discover" || state.observed.length !== rules.itemIds.length) return state;
      return { ...state, phase: "match" };
    case "grab":
      if (state.phase !== "match" || state.held || state.matched.includes(action.id) || !rules.itemIds.includes(action.id)) return state;
      return { ...state, held: action.id };
    case "cancel":
      return state.held === action.id ? { ...state, held: null } : state;
    case "drop": {
      if (state.phase !== "match" || state.held !== action.id) return state;
      if (rules.targetFor(action.id) !== action.target) return { ...state, held: null };
      const matched = [...state.matched, action.id];
      return { ...state, held: null, matched, phase: matched.length === rules.itemIds.length ? "done" : "match" };
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run components/handActivity/handBenchPlay.test.ts`
Expected: PASS (all tests).

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/handActivity/handBenchPlay.ts apps/web/components/handActivity/handBenchPlay.test.ts
git commit -m "feat: add the pure hand-play engine for camera-first activities"
```

---

### Task 2: Gesture controller and frame adapters

**Files:**
- Create: `apps/web/components/handActivity/handBenchController.ts`
- Create: `apps/web/components/handActivity/handBenchFrame.ts`
- Test: `apps/web/components/handActivity/handBenchController.test.ts`
- Test: `apps/web/components/handActivity/handBenchFrame.test.ts`

**Interfaces:**
- Consumes (Task 1): `BenchAction`, `BenchPhase`, `BenchPoint`, `handPointerToBench`. From the repo: `Gesture` (`"pinch" | "point" | "open_palm" | "fist"`) from `../../features/gestures/gestureClassifier`, `GESTURE_CONFIG` (`lostHandGraceMs`, `minConfidence`) from `../../features/gestures/config`, `HandTrackingLatest` from `../../features/gestures/useHandTracking`.
- Produces: `HandBenchController` with `update(input: BenchControllerInput): BenchAction | null` and `reset()`; `trackedBenchPoint(frame: HandTrackingLatest): BenchPoint | null`; `benchStatusForFrame(phase: BenchPhase, tracked: boolean, holding: boolean): string`.

- [ ] **Step 1: Write the failing controller test**

Create `apps/web/components/handActivity/handBenchController.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { GESTURE_CONFIG } from "../../features/gestures/config";
import { HandBenchController, type BenchControllerInput } from "./handBenchController";

const base: BenchControllerInput = { phase: "match", gesture: null, item: null, target: null, isTracking: true, at: 0 };
const step = (controller: HandBenchController, patch: Partial<BenchControllerInput>) => controller.update({ ...base, ...patch });

describe("HandBenchController while discovering", () => {
  it("observes an item when the finger points at it, once per visit", () => {
    const controller = new HandBenchController();
    expect(step(controller, { phase: "discover", gesture: "point", item: "horse" })).toEqual({ type: "observe", id: "horse" });
    expect(step(controller, { phase: "discover", gesture: "point", item: "horse", at: 20 })).toBeNull();
    expect(step(controller, { phase: "discover", gesture: "open_palm", item: "horse", at: 40 })).toBeNull();
    expect(step(controller, { phase: "discover", gesture: "point", item: "horse", at: 60 })).toEqual({ type: "observe", id: "horse" });
  });

  it("ignores pointing at nothing", () => {
    expect(step(new HandBenchController(), { phase: "discover", gesture: "point", item: null })).toBeNull();
  });
});

describe("HandBenchController while matching", () => {
  it("grabs on a pinch over an item", () => {
    expect(step(new HandBenchController(), { gesture: "pinch", item: "frog" })).toEqual({ type: "grab", id: "frog" });
  });

  it("does not grab without a pinch or without an item under the hand", () => {
    const controller = new HandBenchController();
    expect(step(controller, { gesture: "point", item: "frog" })).toBeNull();
    expect(step(controller, { gesture: "pinch", item: null })).toBeNull();
  });

  it("drops on an open palm over a target", () => {
    const controller = new HandBenchController();
    step(controller, { gesture: "pinch", item: "frog" });
    expect(step(controller, { gesture: "open_palm", target: "both", at: 100 })).toEqual({ type: "drop", id: "frog", target: "both" });
  });

  it("puts the item back when the palm opens away from every target", () => {
    const controller = new HandBenchController();
    step(controller, { gesture: "pinch", item: "frog" });
    expect(step(controller, { gesture: "open_palm", target: null, at: 100 })).toEqual({ type: "cancel", id: "frog" });
  });

  it("keeps holding through other gestures", () => {
    const controller = new HandBenchController();
    step(controller, { gesture: "pinch", item: "frog" });
    expect(step(controller, { gesture: "point", target: "both", at: 50 })).toBeNull();
    expect(step(controller, { gesture: "open_palm", target: "both", at: 100 })?.type).toBe("drop");
  });

  it("never drops or scores when tracking is lost, and gives the item back only after the grace period", () => {
    const controller = new HandBenchController();
    step(controller, { gesture: "pinch", item: "frog" });
    expect(step(controller, { isTracking: false, at: 10 })).toBeNull();
    expect(step(controller, { isTracking: false, at: 10 + GESTURE_CONFIG.lostHandGraceMs - 1 })).toBeNull();
    expect(step(controller, { isTracking: false, at: 10 + GESTURE_CONFIG.lostHandGraceMs })).toEqual({ type: "cancel", id: "frog" });
    expect(step(controller, { gesture: "open_palm", target: "both", at: 900 })).toBeNull();
  });

  it("keeps the item if the hand comes back inside the grace period", () => {
    const controller = new HandBenchController();
    step(controller, { gesture: "pinch", item: "frog" });
    step(controller, { isTracking: false, at: 10 });
    step(controller, { gesture: "point", at: 200 });
    expect(step(controller, { isTracking: false, at: 300 })).toBeNull();
    expect(step(controller, { isTracking: false, at: 300 + GESTURE_CONFIG.lostHandGraceMs - 1 })).toBeNull();
  });

  it("does nothing once the lesson is done", () => {
    expect(step(new HandBenchController(), { phase: "done", gesture: "pinch", item: "frog" })).toBeNull();
  });
});
```

- [ ] **Step 2: Write the failing frame-adapter test**

Create `apps/web/components/handActivity/handBenchFrame.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { HandTrackingLatest } from "../../features/gestures/useHandTracking";
import { benchStatusForFrame, trackedBenchPoint } from "./handBenchFrame";

const frame = (patch: Partial<HandTrackingLatest> = {}): HandTrackingLatest => ({
  pointer: { x: 0, y: 0 }, gesture: "point", handedness: "Right", confidence: .9, isTracking: true, ...patch,
});

describe("trackedBenchPoint", () => {
  it("maps a confident tracked hand onto the bench", () => {
    expect(trackedBenchPoint(frame({ pointer: { x: 1, y: -1 } }))).toEqual({ x: .93, y: .07 });
  });

  it("returns null when the hand is not reliably seen", () => {
    expect(trackedBenchPoint(frame({ isTracking: false }))).toBeNull();
    expect(trackedBenchPoint(frame({ confidence: .2 }))).toBeNull();
    expect(trackedBenchPoint(frame({ pointer: null }))).toBeNull();
    expect(trackedBenchPoint(frame({ pointer: { x: Number.NaN, y: 0 } }))).toBeNull();
  });
});

describe("benchStatusForFrame", () => {
  it("asks for a hand when none is seen, and reassures while holding", () => {
    expect(benchStatusForFrame("discover", false, false)).toBe("Show your hand to the camera.");
    expect(benchStatusForFrame("match", false, true)).toBe("Tracking paused. Keep your hand in view.");
  });

  it("gives one clear instruction per phase", () => {
    expect(benchStatusForFrame("discover", true, false)).toBe("Point at an item to discover it.");
    expect(benchStatusForFrame("match", true, false)).toBe("Pinch an item to pick it up.");
    expect(benchStatusForFrame("match", true, true)).toBe("Open your palm over a target to place it.");
    expect(benchStatusForFrame("done", true, false)).toBe("All done!");
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx vitest run components/handActivity/handBenchController.test.ts components/handActivity/handBenchFrame.test.ts`
Expected: FAIL, both modules fail to resolve.

- [ ] **Step 4: Write the controller**

Create `apps/web/components/handActivity/handBenchController.ts`:

```ts
import { GESTURE_CONFIG } from "../../features/gestures/config";
import type { Gesture } from "../../features/gestures/gestureClassifier";
import type { BenchAction, BenchPhase } from "./handBenchPlay";

export type BenchControllerInput = {
  phase: BenchPhase;
  gesture: Gesture | null;
  /** The resting item under the hand, if any. */
  item: string | null;
  /** The target under the hand while carrying an item, if any. */
  target: string | null;
  isTracking: boolean;
  /** Milliseconds, monotonic. */
  at: number;
};

/**
 * Turns stable hand gestures and bench hits into lesson actions.
 * Losing the hand never drops or scores an item; after the shared grace period it is simply put back.
 */
export class HandBenchController {
  private held: string | null = null;
  private lostSince: number | null = null;
  private pointing: string | null = null;

  reset() {
    this.held = null;
    this.lostSince = null;
    this.pointing = null;
  }

  update(input: BenchControllerInput): BenchAction | null {
    if (!input.isTracking) {
      this.lostSince ??= input.at;
      if (input.at - this.lostSince < GESTURE_CONFIG.lostHandGraceMs) return null;
      const id = this.held;
      this.reset();
      return id ? { type: "cancel", id } : null;
    }
    this.lostSince = null;

    if (input.phase === "discover") {
      if (input.gesture !== "point" || !input.item) { this.pointing = null; return null; }
      if (this.pointing === input.item) return null;
      this.pointing = input.item;
      return { type: "observe", id: input.item };
    }
    if (input.phase !== "match") return null;

    if (this.held) {
      if (input.gesture !== "open_palm") return null;
      const id = this.held;
      this.held = null;
      return input.target ? { type: "drop", id, target: input.target } : { type: "cancel", id };
    }
    if (input.gesture === "pinch" && input.item) {
      this.held = input.item;
      return { type: "grab", id: input.item };
    }
    return null;
  }
}
```

- [ ] **Step 5: Write the frame adapters**

Create `apps/web/components/handActivity/handBenchFrame.ts`:

```ts
import { GESTURE_CONFIG } from "../../features/gestures/config";
import type { HandTrackingLatest } from "../../features/gestures/useHandTracking";
import { handPointerToBench, type BenchPhase, type BenchPoint } from "./handBenchPlay";

/** The bench point under a confidently tracked hand, or null so unreliable frames never earn actions. */
export function trackedBenchPoint(frame: HandTrackingLatest): BenchPoint | null {
  const pointer = frame.pointer;
  return frame.isTracking && frame.confidence >= GESTURE_CONFIG.minConfidence && pointer &&
    Number.isFinite(pointer.x) && Number.isFinite(pointer.y) ? handPointerToBench(pointer) : null;
}

export function benchStatusForFrame(phase: BenchPhase, tracked: boolean, holding: boolean): string {
  if (!tracked) return holding ? "Tracking paused. Keep your hand in view." : "Show your hand to the camera.";
  if (phase === "discover") return "Point at an item to discover it.";
  if (phase === "done") return "All done!";
  return holding ? "Open your palm over a target to place it." : "Pinch an item to pick it up.";
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx vitest run components/handActivity`
Expected: PASS for `handBenchPlay`, `handBenchController` and `handBenchFrame`.

- [ ] **Step 7: Typecheck and commit**

Run: `npx tsc --noEmit` (expected: no output).

```bash
git add apps/web/components/handActivity
git commit -m "feat: add the gesture controller and hand-frame adapters for the bench"
```

---

### Task 3: The shared camera-first frame

**Files:**
- Create: `apps/web/components/handActivity/HandActivityShell.tsx`
- Test: `apps/web/components/handActivity/HandActivityShell.test.tsx`

**Interfaces:**
- Consumes: `useHandTracking({ enabled: true })` returning `{ status, video, retry, latest }` (`CameraStatus = "off" | "starting" | "ready" | "denied" | "unavailable"`); `useWiggleSound()` returning `{ unlock }`; `speakIfUnmuted(text)`. The frame classes come from `../science/magnetLab.module.css` (`mission`, `cameraBackdrop`, `cameraBackdropReady`, `cameraBackdropVideo`, `exit`, `missionCard`, `progress`, `checkpoint`, `guide`, `guideSpeaker`, `guideMark`, `speechBubble`, `retry`, `workbench`, `cameraCard`, `cameraStatus`). Reusing that file keeps the look identical to Magnet Lands; a later round moves it.
- Produces: `HandActivityShell(props)`; types `HandActivityShellProps`, `HandActivitySceneContext`; constants `STARTING_LINE`, `HELP_LINE`.

```ts
export type HandActivitySceneContext = {
  latest: RefObject<HandTrackingLatest>;
  ready: boolean;
  reducedMotion: boolean;
  onHandStatus(message: string): void;
};
export type HandActivityShellProps = {
  label: string;                       // aria-label of the section, e.g. "Animal Types activity"
  title: string;                       // mission card heading once the camera is ready
  instruction: string;                 // one line telling the child what to do
  progress: { count: number; total: number; label: string };
  step?: string;                       // e.g. "Step 1 of 2"
  coach: string;                       // the guide's line while playing (spoken when it changes)
  exitLabel: string;                   // e.g. "Back to Science Planet"
  onExit(): void;
  manageFocus?: boolean;               // default true; false when a parent frame already traps focus
  children(scene: HandActivitySceneContext): ReactNode;
};
```

- [ ] **Step 1: Write the failing test**

Create `apps/web/components/handActivity/HandActivityShell.test.tsx`:

```tsx
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

it.each(["denied", "unavailable"] as CameraStatus[])("offers adult help and Try again when the camera is %s", (status) => {
  mock.status = status;
  render(<HandActivityShell {...props()} />);
  expect(screen.getByRole("heading", { name: "Ask an adult to turn on the camera" })).toBeTruthy();
  expect(screen.getByRole("status").textContent).toBe(HELP_LINE);
  fireEvent.click(screen.getByRole("button", { name: "Try again" }));
  expect(mock.retry).toHaveBeenCalledTimes(1);
  expect(screen.queryByTestId("scene")).toBeNull();
});

it("offers adult help when the camera goes back to off after starting", () => {
  const { rerender } = render(<HandActivityShell {...props()} />);
  mock.status = "off";
  rerender(<HandActivityShell {...props()} />);
  expect(screen.getByRole("heading", { name: "Ask an adult to turn on the camera" })).toBeTruthy();
  expect(screen.getByRole("status").textContent).toBe(HELP_LINE);
  fireEvent.click(screen.getByRole("button", { name: "Try again" }));
  expect(mock.retry).toHaveBeenCalledTimes(1);
});

it("does not flash adult help before the camera has started", () => {
  mock.status = "off";
  render(<HandActivityShell {...props()} />);
  expect(screen.getByRole("heading", { name: "Let's get your hand ready" })).toBeTruthy();
  expect(mock.speak).toHaveBeenCalledWith(STARTING_LINE);
  expect(mock.speak).not.toHaveBeenCalledWith(HELP_LINE);
  expect(screen.queryByRole("button", { name: "Try again" })).toBeNull();
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run components/handActivity/HandActivityShell.test.tsx`
Expected: FAIL, `Failed to resolve import "./HandActivityShell"`.

- [ ] **Step 3: Write the shell**

Create `apps/web/components/handActivity/HandActivityShell.tsx`:

```tsx
"use client";

import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { useHandTracking, type HandTrackingLatest } from "../../features/gestures/useHandTracking";
import { useWiggleSound } from "../../features/audio/useWiggleSound";
import { speakIfUnmuted } from "../../features/voice/voicePreference";
import styles from "../science/magnetLab.module.css";

export const STARTING_LINE = "Hi! I'm Wiggle. Let's get your camera ready.";
export const HELP_LINE = "Ask an adult to turn on the camera so we can play together.";

export type HandActivitySceneContext = {
  latest: RefObject<HandTrackingLatest>;
  ready: boolean;
  reducedMotion: boolean;
  onHandStatus(message: string): void;
};

export type HandActivityShellProps = {
  label: string;
  title: string;
  instruction: string;
  progress: { count: number; total: number; label: string };
  step?: string;
  coach: string;
  exitLabel: string;
  onExit(): void;
  manageFocus?: boolean;
  children(scene: HandActivitySceneContext): ReactNode;
};

/** The camera-first frame shared by hand-played activities: camera backdrop, mission card, guide and adult-help screen. */
export function HandActivityShell({ label, title, instruction, progress, step, coach, exitLabel, onExit, manageFocus = true, children }: HandActivityShellProps) {
  const tracking = useHandTracking({ enabled: true });
  const sound = useWiggleSound();
  const [handStatus, setHandStatus] = useState("Show your hand to the camera.");
  const [reducedMotion, setReducedMotion] = useState(false);
  const [talking, setTalking] = useState(false);
  const [bubblePop, setBubblePop] = useState(0);
  const section = useRef<HTMLElement>(null);
  const exit = useRef(onExit);
  const unlock = useRef(sound.unlock);
  const reduced = useRef(false);
  const seenNonOff = useRef(false);
  exit.current = onExit;
  unlock.current = sound.unlock;
  reduced.current = reducedMotion;

  if (tracking.status !== "off") seenNonOff.current = true;
  // The hook's first render is always "off" and becomes "starting" only in an effect, so "off" only means help once the camera has started.
  const needsHelp = tracking.status === "denied" || tracking.status === "unavailable" || (tracking.status === "off" && seenNonOff.current);
  const ready = tracking.status === "ready";
  const line = needsHelp ? HELP_LINE : !ready ? STARTING_LINE : coach;

  useEffect(() => { unlock.current(); }, []);
  useEffect(() => () => { window.speechSynthesis?.cancel(); }, []);

  useEffect(() => {
    if (!window.matchMedia) return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!manageFocus) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    section.current?.querySelector<HTMLButtonElement>("button")?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); exit.current(); }
      if (event.key !== "Tab") return;
      const controls = Array.from(section.current?.querySelectorAll<HTMLElement>('button:not(:disabled), [href], [tabindex="0"]') ?? []);
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && (document.activeElement === first || !section.current?.contains(document.activeElement))) {
        event.preventDefault(); last?.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !section.current?.contains(document.activeElement))) {
        event.preventDefault(); first?.focus();
      }
    };
    document.addEventListener("keydown", keydown, true);
    return () => {
      document.removeEventListener("keydown", keydown, true);
      if (previous?.isConnected && previous !== document.body) previous.focus();
    };
  }, [manageFocus]);

  useEffect(() => {
    setBubblePop((value) => value + 1);
    speakIfUnmuted(line);
    setTalking(true);
    const done = window.setTimeout(() => setTalking(false), reduced.current ? 400 : 2200);
    return () => window.clearTimeout(done);
  }, [line]);

  return <section ref={section} className={styles.mission} aria-label={label} onPointerDown={() => unlock.current()}>
    <div className={ready ? styles.cameraBackdropReady : styles.cameraBackdrop} aria-hidden="true">
      <video ref={tracking.video} muted playsInline className={styles.cameraBackdropVideo} />
    </div>
    <button className={styles.exit} type="button" onClick={onExit}>{exitLabel}</button>
    <header className={styles.missionCard}>
      <h1>{needsHelp ? "Ask an adult to turn on the camera" : !ready ? "Let's get your hand ready" : title}</h1>
      {ready && <>
        <p>{instruction}</p>
        <div className={styles.progress} role="img" aria-label={`${progress.count} of ${progress.total} ${progress.label}`}>
          {Array.from({ length: progress.total }, (_, index) => <span key={index} data-complete={index < progress.count} />)}
        </div>
        {step ? <p className={styles.checkpoint}>{step}</p> : null}
      </>}
    </header>
    <aside className={styles.guide}>
      <div className={styles.guideSpeaker} data-talking={talking || undefined}>
        <img className={styles.guideMark} src="/brand/wiggle-mark.png" alt="" />
      </div>
      <p key={bubblePop} className={styles.speechBubble} role="status" aria-live="polite" data-reduced-motion={reducedMotion || undefined}>
        {line}
      </p>
      {needsHelp && <button className={styles.retry} type="button" onClick={tracking.retry}>Try again</button>}
    </aside>
    <div className={styles.workbench}>
      {ready && children({ latest: tracking.latest, ready, reducedMotion, onHandStatus: setHandStatus })}
    </div>
    <aside className={styles.cameraCard}>
      <h2>Your Hand</h2>
      {!ready && <p className={styles.cameraStatus}>{needsHelp ? "Camera needed" : "Getting ready…"}</p>}
      <p>{ready ? handStatus : "Your hand plays the activity."}</p>
    </aside>
  </section>;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run components/handActivity/HandActivityShell.test.tsx`
Expected: PASS (11 tests).

If the "traps focus" test fails because the exit button is not the first button in the section, keep the exit button first in the JSX; it is.

- [ ] **Step 5: Typecheck, lint and commit**

Run: `npx tsc --noEmit` then `npx eslint components/handActivity` (expected: no output from either).

```bash
git add apps/web/components/handActivity/HandActivityShell.tsx apps/web/components/handActivity/HandActivityShell.test.tsx
git commit -m "feat: add the shared camera-first frame for hand-played activities"
```

---

### Task 4: The shared 3D bench scene

**Files:**
- Create: `apps/web/components/handActivity/benchSet.ts`
- Create: `apps/web/components/handActivity/HandBenchScene.tsx`

The scene is React Three Fiber and cannot be meaningfully unit-tested in jsdom; its logic lives in the already-tested engine, controller and frame adapters. It is verified by the typecheck here, by the session tests in Task 5 (which mock it and drive the same `onAction` it emits), and by the visual check in Task 5.

**Interfaces:**
- Consumes (Tasks 1 and 2): `BenchAction`, `BenchPoint`, `BenchState`, `BenchZone`, `benchHit`, `HandBenchController`, `trackedBenchPoint`, `benchStatusForFrame`; `HandTrackingLatest`.
- Produces:

```ts
// benchSet.ts
export type ItemModelProps = { held: boolean; hovered: boolean; matched: boolean; reducedMotion: boolean };
export type PadProps = { active: boolean; filled: boolean; reducedMotion: boolean };
export type BenchSetItem = { id: string; home: BenchPoint; radius: number; Model: ComponentType<ItemModelProps> };
export type BenchSetTarget = { id: string; at: BenchPoint; radius: number; settle: BenchPoint; Pad: ComponentType<PadProps> };
export type BenchSet = { land: string; label: string; items: BenchSetItem[]; targets: BenchSetTarget[]; Scenery: ComponentType };

// HandBenchScene.tsx
export type HandBenchSceneProps = {
  set: BenchSet; state: BenchState; targetFor(itemId: string): string | undefined;
  latest: RefObject<HandTrackingLatest>; reducedMotion: boolean;
  onAction(action: BenchAction): void; onHandStatus(message: string): void;
};
export function HandBenchScene(props: HandBenchSceneProps): JSX.Element;
export const BENCH_WIDTH = 2.8, BENCH_HEIGHT = 1.7; export const benchX, benchY;
```

- [ ] **Step 1: Write the set types**

Create `apps/web/components/handActivity/benchSet.ts`:

```ts
import type { ComponentType } from "react";
import type { BenchPoint } from "./handBenchPlay";

/** Presentation state a 3D item model can react to. Models draw around their own origin. */
export type ItemModelProps = { held: boolean; hovered: boolean; matched: boolean; reducedMotion: boolean };
/** Presentation state a target pad can react to. Pads draw around their own origin, facing the camera. */
export type PadProps = { active: boolean; filled: boolean; reducedMotion: boolean };

/** All positions are bench coordinates: 0 to 1 on both axes, y up. Radii are hit areas in the same units. */
export type BenchSetItem = { id: string; home: BenchPoint; radius: number; Model: ComponentType<ItemModelProps> };
export type BenchSetTarget = {
  id: string;
  at: BenchPoint;
  radius: number;
  /** Where a matched item settles, as an offset from `at`. */
  settle: BenchPoint;
  Pad: ComponentType<PadProps>;
};

/** One land's 3D content. The engine only ever sees ids and coordinates from this. */
export type BenchSet = {
  land: string;
  /** Accessible name for the 3D view, e.g. "Animal Types workbench". */
  label: string;
  items: BenchSetItem[];
  targets: BenchSetTarget[];
  Scenery: ComponentType;
};
```

- [ ] **Step 2: Write the scene**

Create `apps/web/components/handActivity/HandBenchScene.tsx`:

```tsx
"use client";

import { Component, useCallback, useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import type { Group, Mesh } from "three";
import type { HandTrackingLatest } from "../../features/gestures/useHandTracking";
import type { BenchSet } from "./benchSet";
import { HandBenchController } from "./handBenchController";
import { benchStatusForFrame, trackedBenchPoint } from "./handBenchFrame";
import { benchHit, type BenchAction, type BenchPoint, type BenchState, type BenchZone } from "./handBenchPlay";

export type HandBenchSceneProps = {
  set: BenchSet;
  state: BenchState;
  targetFor(itemId: string): string | undefined;
  latest: RefObject<HandTrackingLatest>;
  reducedMotion: boolean;
  onAction(action: BenchAction): void;
  onHandStatus(message: string): void;
};

export const BENCH_WIDTH = 2.8;
export const BENCH_HEIGHT = 1.7;
export const benchX = (x: number) => (x - .5) * BENCH_WIDTH;
export const benchY = (y: number) => (y - .5) * BENCH_HEIGHT;

const TARGET_Z = .1;
const REST_Z = .3;
const HELD_Z = .6;
const FIELD_OF_VIEW = 42;

/** Keeps the whole bench in view on narrow screens by moving the camera back. */
function FitBench() {
  const { camera, size } = useThree();
  useEffect(() => {
    const aspect = size.width / Math.max(1, size.height);
    const halfFov = Math.tan((FIELD_OF_VIEW * Math.PI) / 360);
    camera.position.z = Math.max(5.3, 1.75 / (halfFov * aspect), 1.1 / halfFov);
    camera.updateProjectionMatrix();
  }, [camera, size]);
  return null;
}

/** A short ring of sparkles where an item has just been matched. */
function MatchBurst({ x, y, onDone }: { x: number; y: number; onDone(): void }) {
  const group = useRef<Group>(null);
  const age = useRef(0);
  const finished = useRef(false);
  useFrame((_, rawDelta) => {
    age.current += Math.min(rawDelta, .05);
    const life = age.current / .8;
    if (life >= 1) {
      if (!finished.current) { finished.current = true; onDone(); }
      return;
    }
    group.current?.children.forEach((child, index) => {
      const angle = (index / 8) * Math.PI * 2;
      child.position.set(Math.cos(angle) * life * .35, Math.sin(angle) * life * .35, 0);
      child.scale.setScalar(Math.max(.01, 1 - life));
    });
  });
  return <group ref={group} position={[x, y, .7]}>
    {Array.from({ length: 8 }, (_, index) => <mesh key={index}>
      <sphereGeometry args={[.035, 8, 6]} />
      <meshBasicMaterial color={index % 2 ? "#ffe17d" : "#9dffb8"} />
    </mesh>)}
  </group>;
}

function BenchInteraction({ set, state, targetFor, latest, reducedMotion, onAction, onHandStatus }: HandBenchSceneProps) {
  const controller = useRef(new HandBenchController());
  const groups = useRef(new Map<string, Group>());
  const cursor = useRef<Group>(null);
  const dot = useRef<Mesh>(null);
  const current = useRef({ state, onAction, onHandStatus });
  current.current = { state, onAction, onHandStatus };
  const hoverRef = useRef<string | null>(null);
  const overRef = useRef<string | null>(null);
  const statusRef = useRef("");
  const heldAt = useRef<BenchPoint | null>(null);
  const wasHeld = useRef<string | null>(null);
  const seenMatched = useRef(state.matched.length);
  const shakeUntil = useRef(new Map<string, number>());
  const burstKey = useRef(0);
  const [hovered, setHovered] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const [bursts, setBursts] = useState<{ key: number; x: number; y: number }[]>([]);
  const Scenery = set.Scenery;

  useFrame(({ clock }, rawDelta) => {
    const delta = Math.min(rawDelta, .05);
    const now = clock.elapsedTime;
    const { state: s, onAction: act, onHandStatus: report } = current.current;
    const frame = latest.current;
    const point = trackedBenchPoint(frame);

    const resting: BenchZone[] = set.items
      .filter((entry) => entry.id !== s.held && !s.matched.includes(entry.id))
      .map((entry) => ({ id: entry.id, at: entry.home, radius: entry.radius }));
    const item = point && s.phase !== "done" ? benchHit(point, resting) : null;
    const target = point && s.held ? benchHit(point, set.targets.map((t) => ({ id: t.id, at: t.at, radius: t.radius }))) : null;

    const action = controller.current.update({ phase: s.phase, gesture: frame.gesture, item, target, isTracking: point !== null, at: now * 1000 });
    if (action) act(action);

    const nextHover = s.held ? null : item;
    if (nextHover !== hoverRef.current) { hoverRef.current = nextHover; setHovered(nextHover); }
    const nextOver = s.held ? target : null;
    if (nextOver !== overRef.current) { overRef.current = nextOver; setOver(nextOver); }

    if (s.held && point) heldAt.current = point;
    if (!s.held) heldAt.current = null;
    if (wasHeld.current && !s.held && !s.matched.includes(wasHeld.current)) shakeUntil.current.set(wasHeld.current, now + .5);
    wasHeld.current = s.held;

    if (s.matched.length > seenMatched.current && !reducedMotion) {
      const id = s.matched[s.matched.length - 1];
      const pad = set.targets.find((t) => t.id === targetFor(id));
      if (pad) {
        burstKey.current += 1;
        const key = burstKey.current;
        setBursts((previous) => [...previous, { key, x: benchX(pad.at.x + pad.settle.x), y: benchY(pad.at.y + pad.settle.y) }]);
      }
    }
    seenMatched.current = s.matched.length;

    const ease = 1 - Math.exp(-(reducedMotion ? 60 : 14) * delta);
    for (const entry of set.items) {
      const group = groups.current.get(entry.id);
      if (!group) continue;
      let x = benchX(entry.home.x);
      let y = benchY(entry.home.y);
      let z = REST_Z;
      if (entry.id === s.held && heldAt.current) {
        x = benchX(heldAt.current.x); y = benchY(heldAt.current.y); z = HELD_Z;
      } else if (s.matched.includes(entry.id)) {
        const pad = set.targets.find((t) => t.id === targetFor(entry.id));
        if (pad) { x = benchX(pad.at.x + pad.settle.x); y = benchY(pad.at.y + pad.settle.y); z = TARGET_Z + .12; }
      }
      group.position.x += (x - group.position.x) * ease;
      group.position.y += (y - group.position.y) * ease;
      group.position.z += (z - group.position.z) * ease;
      const shake = shakeUntil.current.get(entry.id) ?? 0;
      group.rotation.z = !reducedMotion && shake > now ? Math.sin(now * 42) * .18 * Math.min(1, shake - now) : 0;
    }

    if (cursor.current) {
      cursor.current.visible = point !== null;
      if (point) cursor.current.position.set(benchX(point.x), benchY(point.y), HELD_Z + .15);
    }
    if (dot.current) dot.current.visible = s.held !== null;

    const message = benchStatusForFrame(s.phase, point !== null, s.held !== null);
    if (message !== statusRef.current) { statusRef.current = message; report(message); }
  });

  return <>
    <Scenery />
    {set.targets.map((t) => {
      const Pad = t.Pad;
      return <group key={t.id} position={[benchX(t.at.x), benchY(t.at.y), TARGET_Z]}>
        <Pad active={over === t.id} filled={state.matched.some((id) => targetFor(id) === t.id)} reducedMotion={reducedMotion} />
      </group>;
    })}
    {set.items.map((entry) => {
      const Model = entry.Model;
      return <group
        key={entry.id}
        ref={(node) => { if (node) groups.current.set(entry.id, node); else groups.current.delete(entry.id); }}
        position={[benchX(entry.home.x), benchY(entry.home.y), REST_Z]}
      >
        <Model held={state.held === entry.id} hovered={hovered === entry.id} matched={state.matched.includes(entry.id)} reducedMotion={reducedMotion} />
      </group>;
    })}
    {bursts.map((burst) => <MatchBurst key={burst.key} x={burst.x} y={burst.y} onDone={() => setBursts((previous) => previous.filter((b) => b.key !== burst.key))} />)}
    <group ref={cursor} visible={false}>
      <mesh><torusGeometry args={[.1, .016, 12, 40]} /><meshBasicMaterial color="#ffe17d" /></mesh>
      <mesh ref={dot} visible={false}><circleGeometry args={[.06, 24]} /><meshBasicMaterial color="#9dffb8" /></mesh>
    </group>
  </>;
}

class GraphicsBoundary extends Component<{ children: ReactNode; onFailure(): void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onFailure(); }
  render() { return this.state.failed ? null : this.props.children; }
}

export function HandBenchScene(props: HandBenchSceneProps) {
  const [webglSupported, setWebglSupported] = useState<boolean | null>(null);
  const reported = useRef(false);
  const report = useRef(props.onHandStatus);
  report.current = props.onHandStatus;
  const reportFailure = useCallback(() => {
    if (reported.current) return;
    reported.current = true;
    setWebglSupported(false);
    report.current("The workbench needs a graphics-capable device.");
  }, []);

  useEffect(() => {
    let supported = false;
    try {
      const probe = document.createElement("canvas");
      const context = probe.getContext("webgl2", { failIfMajorPerformanceCaveat: true });
      if (context) { context.getExtension("WEBGL_lose_context")?.loseContext(); supported = true; }
    } catch { supported = false; }
    if (supported) setWebglSupported(true); else reportFailure();
  }, [reportFailure]);

  if (webglSupported !== true) return null;
  return <GraphicsBoundary onFailure={reportFailure}>
    <Canvas
      aria-label={props.set.label}
      aria-hidden="true"
      style={{ display: "block", width: "100%", height: "100%", minHeight: 320, background: "transparent" }}
      camera={{ position: [0, 0, 5.3], fov: FIELD_OF_VIEW, near: .1, far: 30 }}
      dpr={props.reducedMotion ? 1 : [1, 1.5]}
      gl={{ antialias: !props.reducedMotion, alpha: true, powerPreference: "low-power", failIfMajorPerformanceCaveat: true }}
    >
      <ambientLight intensity={1.45} color="#f7e7c5" />
      <hemisphereLight args={["#fff0d4", "#3e4664", 1.1]} />
      <directionalLight position={[-3, 4, 5]} intensity={2.2} color="#ffd991" />
      <pointLight position={[1.4, 1.1, 2]} intensity={6} distance={6} color="#f39b83" />
      <FitBench />
      <BenchInteraction {...props} />
    </Canvas>
  </GraphicsBoundary>;
}
```

- [ ] **Step 3: Typecheck and lint**

Run: `npx tsc --noEmit` then `npx eslint components/handActivity`
Expected: no output from either. If `react-hooks` lint flags the `current.current = ...` render-time assignment, keep it: `MagnetHandLabScene` uses the same pattern and passes the repo's lint.

- [ ] **Step 4: Commit**

```bash
git add apps/web/components/handActivity/benchSet.ts apps/web/components/handActivity/HandBenchScene.tsx
git commit -m "feat: add the shared 3D bench scene for hand-played activities"
```

---

### Task 5: Shared 3D parts and the Animal Types set

**Files:**
- Create: `apps/web/components/handActivity/sets/setParts.tsx`
- Create: `apps/web/components/handActivity/sets/AnimalSet.tsx`
- Create: `apps/web/components/handActivity/sets/index.ts`
- Test: `apps/web/components/handActivity/sets/sets.test.ts`

**Interfaces:**
- Consumes (Task 4): `BenchSet`, `ItemModelProps`, `PadProps` from `../benchSet`. From the repo: `SCIENCE_ACTIVITIES` (`animals.items` ids `horse | frog | bird | fish`, `animals.targets` ids `land | both | air-land | water`).
- Produces: `Lift`, `PadFrame`, `Bench` (setParts); `ANIMAL_SET: BenchSet`; `BENCH_SETS: Record<string, BenchSet | undefined>`.

- [ ] **Step 1: Write the failing set-consistency test**

Create `apps/web/components/handActivity/sets/sets.test.ts`. It runs over every registered set, so Task 7's new sets are covered without edits:

```ts
import { describe, expect, it } from "vitest";
import { SCIENCE_ACTIVITIES } from "../../science/scienceActivities";
import { BENCH_SETS } from "./index";

describe.each(Object.entries(BENCH_SETS).filter(([, set]) => set))("%s bench set", (land, set) => {
  const activity = SCIENCE_ACTIVITIES[land as keyof typeof SCIENCE_ACTIVITIES];

  it("is keyed by a real land and labelled", () => {
    expect(activity).toBeTruthy();
    expect(set!.land).toBe(land);
    expect(set!.label).toMatch(/workbench$/);
  });

  it("offers exactly the lesson's items and targets", () => {
    expect(set!.items.map((item) => item.id).sort()).toEqual(activity.items.map((item) => item.id).sort());
    expect(set!.targets.map((target) => target.id).sort()).toEqual(activity.targets.map((target) => target.id).sort());
  });

  it("keeps every hit area on the bench and clear of every other", () => {
    const zones = [
      ...set!.items.map((item) => ({ id: item.id, at: item.home, radius: item.radius })),
      ...set!.targets.map((target) => ({ id: target.id, at: target.at, radius: target.radius })),
    ];
    for (const zone of zones) {
      expect(zone.at.x - zone.radius).toBeGreaterThanOrEqual(0);
      expect(zone.at.x + zone.radius).toBeLessThanOrEqual(1);
      expect(zone.at.y - zone.radius).toBeGreaterThanOrEqual(0);
      expect(zone.at.y + zone.radius).toBeLessThanOrEqual(1);
    }
    for (let a = 0; a < zones.length; a++) {
      for (let b = a + 1; b < zones.length; b++) {
        const gap = Math.hypot(zones[a].at.x - zones[b].at.x, zones[a].at.y - zones[b].at.y);
        expect(gap, `${zones[a].id} overlaps ${zones[b].id}`).toBeGreaterThanOrEqual(zones[a].radius + zones[b].radius);
      }
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run components/handActivity/sets/sets.test.ts`
Expected: FAIL, `Failed to resolve import "./index"`.

- [ ] **Step 3: Write the shared 3D parts**

Create `apps/web/components/handActivity/sets/setParts.tsx`:

```tsx
import type { ReactNode } from "react";
import type { ItemModelProps, PadProps } from "../benchSet";

/** Grows and lifts an item model when it is hovered or carried. */
export function Lift({ held, hovered, matched, reducedMotion, children }: ItemModelProps & { children: ReactNode }) {
  const scale = held ? 1.25 : hovered ? 1.12 : matched ? .92 : 1;
  return <group scale={scale} position={[0, held && !reducedMotion ? .04 : 0, 0]}>{children}</group>;
}

/** A target pad's outline: bright when the carried item is over it, green once it holds its item. */
export function PadFrame({ active, filled, radius = .25, children }: PadProps & { radius?: number; children: ReactNode }) {
  const color = active ? "#ffe17d" : filled ? "#9dffb8" : "#ffffff";
  return <group>
    {children}
    <mesh position={[0, 0, .02]}>
      <torusGeometry args={[radius, active ? .022 : .012, 10, 48]} />
      <meshBasicMaterial color={color} transparent opacity={active || filled ? 1 : .55} />
    </mesh>
  </group>;
}

/** The slab the lesson sits on. */
export function Bench({ color }: { color: string }) {
  return <mesh position={[0, 0, -.08]}>
    <boxGeometry args={[3.1, 1.95, .12]} />
    <meshStandardMaterial color={color} roughness={.75} transparent opacity={.92} />
  </mesh>;
}
```

- [ ] **Step 4: Write the Animal Types set**

Create `apps/web/components/handActivity/sets/AnimalSet.tsx`:

```tsx
import type { BenchSet, ItemModelProps, PadProps } from "../benchSet";
import { Bench, Lift, PadFrame } from "./setParts";

const Mat = ({ color }: { color: string }) => <meshStandardMaterial color={color} roughness={.6} />;
const Dark = () => <meshBasicMaterial color="#1b1b1b" />;

function Horse(props: ItemModelProps) {
  return <Lift {...props}>
    <mesh position={[0, .02, 0]} rotation={[0, 0, Math.PI / 2]}><capsuleGeometry args={[.1, .26, 4, 12]} /><Mat color="#b9825d" /></mesh>
    <mesh position={[.19, .17, 0]} rotation={[0, 0, -.5]}><capsuleGeometry args={[.055, .17, 4, 10]} /><Mat color="#b9825d" /></mesh>
    <mesh position={[.28, .27, 0]} rotation={[0, 0, -1.1]}><capsuleGeometry args={[.05, .12, 4, 10]} /><Mat color="#a9744f" /></mesh>
    <mesh position={[.22, .3, 0]}><boxGeometry args={[.04, .1, .04]} /><Mat color="#4b3324" /></mesh>
    {[-.16, -.07, .09, .17].map((x) => <mesh key={x} position={[x, -.17, 0]}><cylinderGeometry args={[.03, .026, .2, 8]} /><Mat color="#8b5d3f" /></mesh>)}
    <mesh position={[-.27, .07, 0]} rotation={[0, 0, .6]}><capsuleGeometry args={[.025, .14, 4, 8]} /><Mat color="#4b3324" /></mesh>
    <mesh position={[.3, .3, .05]}><sphereGeometry args={[.014, 8, 6]} /><Dark /></mesh>
  </Lift>;
}

function Frog(props: ItemModelProps) {
  return <Lift {...props}>
    <mesh scale={[1.25, .85, .9]}><sphereGeometry args={[.16, 20, 14]} /><Mat color="#78d56b" /></mesh>
    <mesh position={[0, -.03, .11]} scale={[1, .7, .5]}><sphereGeometry args={[.13, 16, 10]} /><Mat color="#b5ee9c" /></mesh>
    {[-.09, .09].map((x) => <group key={x} position={[x, .13, .06]}>
      <mesh><sphereGeometry args={[.055, 12, 10]} /><Mat color="#78d56b" /></mesh>
      <mesh position={[0, .01, .045]}><sphereGeometry args={[.035, 10, 8]} /><meshBasicMaterial color="#ffffff" /></mesh>
      <mesh position={[0, .01, .075]}><sphereGeometry args={[.017, 8, 6]} /><Dark /></mesh>
    </group>)}
    {[-.2, .2].map((x) => <mesh key={x} position={[x, -.1, .03]} scale={[1, .5, 1]}><sphereGeometry args={[.07, 12, 8]} /><Mat color="#5fc257" /></mesh>)}
    <mesh position={[0, -.05, .15]} rotation={[0, 0, Math.PI]}><torusGeometry args={[.05, .008, 6, 16, Math.PI]} /><meshBasicMaterial color="#2c6b32" /></mesh>
  </Lift>;
}

function Bird(props: ItemModelProps) {
  return <Lift {...props}>
    <mesh scale={[1.15, 1, .95]}><sphereGeometry args={[.15, 20, 14]} /><Mat color="#6dccf3" /></mesh>
    <mesh position={[.15, .1, 0]}><sphereGeometry args={[.085, 14, 10]} /><Mat color="#6dccf3" /></mesh>
    <mesh position={[.24, .09, 0]} rotation={[0, 0, -Math.PI / 2]}><coneGeometry args={[.035, .09, 10]} /><Mat color="#ffb04a" /></mesh>
    <mesh position={[.17, .13, .07]}><sphereGeometry args={[.016, 8, 6]} /><Dark /></mesh>
    <mesh position={[-.03, 0, .12]} rotation={[0, 0, .5]} scale={[1.3, .7, .4]}><sphereGeometry args={[.09, 12, 8]} /><Mat color="#3faee0" /></mesh>
    <mesh position={[-.22, -.03, 0]} rotation={[0, 0, Math.PI / 2 + .3]}><coneGeometry args={[.05, .16, 8]} /><Mat color="#3faee0" /></mesh>
    {[-.03, .05].map((x) => <mesh key={x} position={[x, -.16, 0]}><cylinderGeometry args={[.008, .008, .08, 5]} /><Mat color="#ffb04a" /></mesh>)}
  </Lift>;
}

function Fish(props: ItemModelProps) {
  return <Lift {...props}>
    <mesh scale={[1.5, .85, .6]}><sphereGeometry args={[.14, 20, 14]} /><Mat color="#ffa86d" /></mesh>
    <mesh position={[-.24, 0, 0]} rotation={[0, 0, Math.PI / 2]} scale={[1, 1, .4]}><coneGeometry args={[.11, .16, 3]} /><Mat color="#ff8a4a" /></mesh>
    <mesh position={[0, .13, 0]} scale={[1.2, .5, .3]}><sphereGeometry args={[.07, 10, 8]} /><Mat color="#ff8a4a" /></mesh>
    <mesh position={[.14, .03, .07]}><sphereGeometry args={[.026, 10, 8]} /><meshBasicMaterial color="#ffffff" /></mesh>
    <mesh position={[.15, .03, .095]}><sphereGeometry args={[.012, 8, 6]} /><Dark /></mesh>
    <mesh position={[.05, -.04, .05]} rotation={[0, 0, .3]} scale={[1.2, .5, .3]}><sphereGeometry args={[.05, 10, 8]} /><Mat color="#ff8a4a" /></mesh>
  </Lift>;
}

function Meadow(props: PadProps) {
  return <PadFrame {...props}>
    <mesh><circleGeometry args={[.25, 40]} /><meshStandardMaterial color="#8fd18a" roughness={.9} /></mesh>
    {([[-.1, .05], [.08, -.08], [.12, .1], [-.06, -.12]] as const).map(([x, y]) => <mesh key={`${x}${y}`} position={[x, y, .03]}><coneGeometry args={[.02, .07, 6]} /><meshStandardMaterial color="#4f9d4e" /></mesh>)}
  </PadFrame>;
}

function Shore(props: PadProps) {
  return <PadFrame {...props}>
    <mesh><circleGeometry args={[.25, 40, 0, Math.PI]} /><meshStandardMaterial color="#e9d29a" roughness={.9} /></mesh>
    <mesh><circleGeometry args={[.25, 40, Math.PI, Math.PI]} /><meshStandardMaterial color="#5fb7e8" roughness={.5} /></mesh>
  </PadFrame>;
}

function Sky(props: PadProps) {
  return <PadFrame {...props}>
    <mesh><circleGeometry args={[.25, 40]} /><meshStandardMaterial color="#a8dcf5" roughness={.9} /></mesh>
    {([[-.08, .06], [.02, .09], [.1, .04]] as const).map(([x, y]) => <mesh key={`${x}${y}`} position={[x, y, .04]}><sphereGeometry args={[.05, 12, 10]} /><meshStandardMaterial color="#ffffff" /></mesh>)}
  </PadFrame>;
}

function Pool(props: PadProps) {
  return <PadFrame {...props}>
    <mesh><circleGeometry args={[.25, 40]} /><meshStandardMaterial color="#4aa8e0" roughness={.4} /></mesh>
    {[.1, .16].map((radius) => <mesh key={radius} position={[0, 0, .03]}><torusGeometry args={[radius, .006, 6, 32]} /><meshBasicMaterial color="#ffffff" transparent opacity={.6} /></mesh>)}
  </PadFrame>;
}

const ITEM_Y = .28;
const TARGET_Y = .72;

export const ANIMAL_SET: BenchSet = {
  land: "animals",
  label: "Animal Types workbench",
  items: [
    { id: "horse", home: { x: .2, y: ITEM_Y }, radius: .09, Model: Horse },
    { id: "frog", home: { x: .4, y: ITEM_Y }, radius: .09, Model: Frog },
    { id: "bird", home: { x: .6, y: ITEM_Y }, radius: .09, Model: Bird },
    { id: "fish", home: { x: .8, y: ITEM_Y }, radius: .09, Model: Fish },
  ],
  targets: [
    { id: "land", at: { x: .15, y: TARGET_Y }, radius: .1, settle: { x: 0, y: 0 }, Pad: Meadow },
    { id: "both", at: { x: .38, y: TARGET_Y }, radius: .1, settle: { x: 0, y: 0 }, Pad: Shore },
    { id: "air-land", at: { x: .62, y: TARGET_Y }, radius: .1, settle: { x: 0, y: 0 }, Pad: Sky },
    { id: "water", at: { x: .85, y: TARGET_Y }, radius: .1, settle: { x: 0, y: 0 }, Pad: Pool },
  ],
  Scenery: () => <Bench color="#c9a26b" />,
};
```

- [ ] **Step 5: Write the registry**

Create `apps/web/components/handActivity/sets/index.ts`:

```ts
import type { BenchSet } from "../benchSet";
import { ANIMAL_SET } from "./AnimalSet";

/** Each Science land's 3D set, keyed by land id. */
export const BENCH_SETS: Record<string, BenchSet | undefined> = {
  animals: ANIMAL_SET,
};
```

- [ ] **Step 6: Run tests, typecheck, lint**

Run: `npx vitest run components/handActivity/sets/sets.test.ts` (expected: PASS, 3 tests for `animals`), then `npx tsc --noEmit` and `npx eslint components/handActivity` (expected: no output).

- [ ] **Step 7: Commit**

```bash
git add apps/web/components/handActivity/sets
git commit -m "feat: add the Animal Types 3D set and a set-consistency test"
```

---

### Task 6: The hand session, wired in for Animal Types

**Files:**
- Create: `apps/web/components/science/ScienceHandSession.tsx`
- Test: `apps/web/components/science/ScienceHandSession.test.tsx`
- Modify: `apps/web/components/science/scienceActivities.ts` (add `StarterProgress`)
- Modify: `apps/web/components/science/SciencePlanetCanvas.tsx` (open the hand session for lands that have a set)

**Interfaces:**
- Consumes: `HandActivityShell` and `HandActivitySceneContext` (Task 3); `HandBenchScene` (Task 4); `benchReducer`, `initialBenchState`, `BenchAction`, `BenchRules`, `BenchState` (Task 1); `BENCH_SETS` (Task 5); `SCIENCE_ACTIVITIES`, `StarterLand`; `scienceLand(id).name`; `sessionStyles.magnetOverlay` from `ScienceSession.module.css`; `useWiggleSound().play` with names `"correct" | "tryAgain" | "celebrate"`.
- Produces: `ScienceHandSession(props: { land: StarterLand; progress: StarterProgress; onProgress(next: StarterProgress): void; onClose(): void })`; `StarterProgress = { observed: string[]; matched: string[] }` exported from `scienceActivities.ts`.

- [ ] **Step 1: Add the shared progress type**

In `apps/web/components/science/scienceActivities.ts`, directly after the `export type ActivityItem = ...` line, add:

```ts
export type StarterProgress = { observed: string[]; matched: string[] };
```

(`ScienceStarterSession.tsx` still exports an identical type until Task 7; the two are structurally compatible.)

- [ ] **Step 2: Write the failing session test**

Create `apps/web/components/science/ScienceHandSession.test.tsx`. It runs over every land that has a registered set, so Task 7's sets are covered without edits:

```tsx
// @vitest-environment jsdom
import React, { useState } from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { BenchAction } from "../handActivity/handBenchPlay";
import type { HandBenchSceneProps } from "../handActivity/HandBenchScene";
import { BENCH_SETS } from "../handActivity/sets";
import { ScienceHandSession } from "./ScienceHandSession";
import { SCIENCE_ACTIVITIES, type StarterLand, type StarterProgress } from "./scienceActivities";

const mock = vi.hoisted(() => ({ scene: null as HandBenchSceneProps | null, play: vi.fn(), speak: vi.fn() }));
vi.mock("../../features/gestures/useHandTracking", () => ({
  useHandTracking: () => ({ status: "ready", video: { current: null }, retry: vi.fn(), latest: { current: { isTracking: false } } }),
}));
vi.mock("../handActivity/HandBenchScene", () => ({
  HandBenchScene: (props: HandBenchSceneProps) => { mock.scene = props; return <div data-testid="scene" />; },
}));
vi.mock("../../features/voice/voicePreference", () => ({ speakIfUnmuted: (text: string) => mock.speak(text) }));
vi.mock("../../features/audio/useWiggleSound", () => ({
  useWiggleSound: () => ({ play: mock.play, unlock: vi.fn(), muted: false, setMuted: vi.fn() }),
}));

beforeEach(() => { mock.scene = null; vi.clearAllMocks(); vi.useFakeTimers(); });
afterEach(() => { cleanup(); vi.useRealTimers(); });

const lands = (Object.keys(BENCH_SETS) as StarterLand[]).filter((land) => BENCH_SETS[land]);
const send = (action: BenchAction) => act(() => mock.scene!.onAction(action));
const status = () => screen.getByRole("status").textContent ?? "";

function Harness({ land, initial, onClose = vi.fn() }: { land: StarterLand; initial?: StarterProgress; onClose?: () => void }) {
  const [progress, setProgress] = useState<StarterProgress>(initial ?? { observed: [], matched: [] });
  return <>
    <span data-testid="progress">{progress.observed.length}/{progress.matched.length}</span>
    <ScienceHandSession land={land} progress={progress} onProgress={setProgress} onClose={onClose} />
  </>;
}

it.each(lands)("%s: plays discover, then match, then done with hand actions only", (land) => {
  const activity = SCIENCE_ACTIVITIES[land];
  render(<Harness land={land} />);
  expect(screen.getByText("Step 1 of 2 · Discover")).toBeTruthy();
  expect(screen.queryByRole("button", { name: /^(Discover|Grab|Next:)/ })).toBeNull();

  for (const item of activity.items) send({ type: "observe", id: item.id });
  expect(status()).toBe(activity.items[activity.items.length - 1].fact);
  expect(screen.getByTestId("progress").textContent).toBe(`${activity.items.length}/0`);
  act(() => { vi.advanceTimersByTime(2300); });
  expect(screen.getByText("Step 2 of 2 · Match")).toBeTruthy();

  const first = activity.items[0];
  const wrong = activity.targets.find((target) => target.id !== first.target)!;
  send({ type: "grab", id: first.id });
  send({ type: "drop", id: first.id, target: wrong.id });
  expect(status()).toContain("Try again");
  expect(mock.play).toHaveBeenCalledWith("tryAgain");
  expect(screen.getByTestId("progress").textContent).toBe(`${activity.items.length}/0`);

  for (const item of activity.items) {
    send({ type: "grab", id: item.id });
    send({ type: "drop", id: item.id, target: item.target });
  }
  expect(status()).toBe("You did it! Every discovery is in its place.");
  expect(mock.play).toHaveBeenCalledWith("celebrate");
  expect(screen.getByTestId("progress").textContent).toBe(`${activity.items.length}/${activity.items.length}`);
  expect(screen.getByText("All done!", { selector: "p" })).toBeTruthy();
});

it("gives the scene the lesson's own targets", () => {
  render(<Harness land="animals" />);
  expect(mock.scene?.targetFor("frog")).toBe("both");
  expect(mock.scene?.targetFor("nothing")).toBeUndefined();
});

it("resumes in the matching step when every discovery was already made", () => {
  const activity = SCIENCE_ACTIVITIES.animals;
  render(<Harness land="animals" initial={{ observed: activity.items.map((item) => item.id), matched: [] }} />);
  expect(screen.getByText("Step 2 of 2 · Match")).toBeTruthy();
});

it("resumes as finished when every match was already made", () => {
  const ids = SCIENCE_ACTIVITIES.animals.items.map((item) => item.id);
  render(<Harness land="animals" initial={{ observed: ids, matched: ids }} />);
  expect(screen.getByText("All done!", { selector: "p" })).toBeTruthy();
});

it("leaves through the exit button", () => {
  const onClose = vi.fn();
  render(<Harness land="animals" onClose={onClose} />);
  fireEvent.click(screen.getByRole("button", { name: "Back to Science Planet" }));
  expect(onClose).toHaveBeenCalledTimes(1);
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run components/science/ScienceHandSession.test.tsx`
Expected: FAIL, `Failed to resolve import "./ScienceHandSession"`.

- [ ] **Step 4: Write the session**

Create `apps/web/components/science/ScienceHandSession.tsx`:

```tsx
"use client";

import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import { useWiggleSound } from "../../features/audio/useWiggleSound";
import { HandActivityShell } from "../handActivity/HandActivityShell";
import { HandBenchScene } from "../handActivity/HandBenchScene";
import { benchReducer, initialBenchState, type BenchAction, type BenchRules, type BenchState } from "../handActivity/handBenchPlay";
import { BENCH_SETS } from "../handActivity/sets";
import { SCIENCE_ACTIVITIES, type StarterLand, type StarterProgress } from "./scienceActivities";
import { scienceLand } from "./scienceLands";
import sessionStyles from "./ScienceSession.module.css";

const MATCH_LINE = "Now let's match! Pinch one, then open your palm over its home.";
const DONE_LINE = "You did it! Every discovery is in its place.";
const LAST_FACT_PAUSE_MS = 2200;

function rulesFor(land: StarterLand): BenchRules {
  const activity = SCIENCE_ACTIVITIES[land];
  return { itemIds: activity.items.map((item) => item.id), targetFor: (id) => activity.items.find((item) => item.id === id)?.target };
}

function initialState(rules: BenchRules, progress: StarterProgress): BenchState {
  const observed = progress.observed.filter((id) => rules.itemIds.includes(id));
  const matched = progress.matched.filter((id) => rules.itemIds.includes(id));
  const phase = matched.length === rules.itemIds.length ? "done" : observed.length === rules.itemIds.length ? "match" : "discover";
  return { ...initialBenchState, phase, observed, matched };
}

export type ScienceHandSessionProps = {
  land: StarterLand;
  progress: StarterProgress;
  onProgress(next: StarterProgress): void;
  onClose(): void;
};

/** A camera-first hand session for one Science land. The caller only opens it for lands that have a bench set. */
export function ScienceHandSession({ land, progress, onProgress, onClose }: ScienceHandSessionProps) {
  const activity = SCIENCE_ACTIVITIES[land];
  const set = BENCH_SETS[land]!;
  const rules = useMemo(() => rulesFor(land), [land]);
  const sound = useWiggleSound();
  const [state, dispatch] = useReducer(
    (current: BenchState, action: BenchAction) => benchReducer(rules, current, action),
    undefined,
    () => initialState(rules, progress),
  );
  const stateRef = useRef(state);
  stateRef.current = state;
  const [line, setLine] = useState(() => state.phase === "done" ? DONE_LINE : state.phase === "match" ? MATCH_LINE : activity.instruction);

  const factFor = (id: string) => activity.items.find((item) => item.id === id)?.fact ?? "";
  const handleAction = (action: BenchAction) => {
    const before = stateRef.current;
    const after = benchReducer(rules, before, action);
    if (after === before) return;
    dispatch(action);
    if (action.type === "observe") setLine(factFor(action.id));
    else if (action.type === "grab") setLine("Carry it to where it belongs, then open your palm.");
    else if (action.type === "cancel") setLine("No problem! Pinch it again when you're ready.");
    else if (action.type === "drop") {
      if (after.matched.length > before.matched.length) {
        if (after.phase === "done") { sound.play("celebrate"); setLine(DONE_LINE); }
        else { sound.play("correct"); setLine("That's a match! Pick another one."); }
      } else { sound.play("tryAgain"); setLine(`Try again. ${factFor(action.id)}`); }
    }
  };

  useEffect(() => {
    if (state.phase !== "discover" || state.observed.length !== rules.itemIds.length) return;
    const timer = window.setTimeout(() => { dispatch({ type: "advance" }); setLine(MATCH_LINE); }, LAST_FACT_PAUSE_MS);
    return () => window.clearTimeout(timer);
  }, [state.phase, state.observed.length, rules]);

  useEffect(() => {
    if (state.observed.length === progress.observed.length && state.matched.length === progress.matched.length) return;
    onProgress({ observed: state.observed, matched: state.matched });
  }, [state.observed, state.matched, progress, onProgress]);

  const total = rules.itemIds.length;
  const discovering = state.phase === "discover";
  return <div className={sessionStyles.magnetOverlay} data-session-controls>
    <HandActivityShell
      label={`${scienceLand(land).name} activity`}
      title={activity.title}
      instruction={discovering ? "Point at each one to learn about it." : state.phase === "match" ? "Pinch to pick up. Open your palm over a target." : "Wonderful exploring!"}
      progress={{ count: discovering ? state.observed.length : state.matched.length, total, label: discovering ? "discoveries" : "matches" }}
      step={discovering ? "Step 1 of 2 · Discover" : state.phase === "match" ? "Step 2 of 2 · Match" : "All done!"}
      coach={line}
      exitLabel="Back to Science Planet"
      onExit={onClose}
      manageFocus={false}
    >
      {(scene) => <HandBenchScene
        set={set}
        state={state}
        targetFor={rules.targetFor}
        latest={scene.latest}
        reducedMotion={scene.reducedMotion}
        onAction={handleAction}
        onHandStatus={scene.onHandStatus}
      />}
    </HandActivityShell>
  </div>;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run components/science/ScienceHandSession.test.tsx`
Expected: PASS (`animals` full-play test plus four more).

The test harness uses a `<span>` (not `<output>`) for its progress readout because `<output>` has an implicit `status` role and would collide with the guide bubble, which is the only `role="status"` element inside the shell.

- [ ] **Step 6: Wire it into the Science Planet**

In `apps/web/components/science/SciencePlanetCanvas.tsx`:

Add these imports next to the existing `ScienceStarterSession` import:

```tsx
import { ScienceHandSession } from './ScienceHandSession';
import { BENCH_SETS } from '../handActivity/sets';
```

Replace the line

```tsx
    {starter ? <ScienceStarterSession key={starter} land={starter} graphics={available} progress={progress[starter]} onProgress={value => setProgress(previous => ({ ...previous, [starter]: value }))} onClose={close} /> : null}
```

with

```tsx
    {starter ? (BENCH_SETS[starter]
      ? <ScienceHandSession key={starter} land={starter} progress={progress[starter]} onProgress={value => setProgress(previous => ({ ...previous, [starter]: value }))} onClose={close} />
      : <ScienceStarterSession key={starter} land={starter} graphics={available} progress={progress[starter]} onProgress={value => setProgress(previous => ({ ...previous, [starter]: value }))} onClose={close} />) : null}
```

Colors Canyon and Life Cycle Garden keep the old session until Task 7 gives them sets.

- [ ] **Step 7: Typecheck, lint and run the related unit tests**

Run: `npx tsc --noEmit`, `npx eslint components/science components/handActivity`, then `npx vitest run components/science components/handActivity`
Expected: no typecheck or lint output; all tests pass. `SciencePlanetCanvas.test.tsx` must still pass unchanged.

- [ ] **Step 8: Visual check in a real browser**

Rebuild and serve: from the repo root `NODE_OPTIONS=--max-old-space-size=2048 npm run build --workspace=@wiggle/web`, then from `apps/web` `NEXT_IGNORE_INCORRECT_LOCKFILE=1 node node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 3300` (leave it running).

Save this script outside the repo as `hand-bench-shots.mjs`, and run it from `apps/web` with `node <path-to-script> animals <output-folder>`:

```js
import { createRequire } from "node:module";
const require = createRequire(process.cwd() + "/package.json");
const { chromium } = require("@playwright/test");

const land = process.argv[2] ?? "animals";
const out = process.argv[3] ?? ".";
const names = { animals: "Animal Types", colors: "Colors Canyon", "life-cycle": "Life Cycle Garden" };
const browser = await chromium.launch({ channel: "chrome", args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"] });
for (const [tag, viewport, mobile] of [["desktop", { width: 1440, height: 900 }, false], ["phone", { width: 390, height: 844 }, true]]) {
  const context = await browser.newContext({ viewport, isMobile: mobile, hasTouch: mobile });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(String(error)));
  await page.goto("http://127.0.0.1:3300/?world=science");
  await page.getByRole("button", { name: `Visit ${names[land]}`, exact: true }).click();
  await page.getByRole("button", { name: /Let.s explore/ }).click({ timeout: 25000 });
  await page.waitForTimeout(9000);
  await page.screenshot({ path: `${out}/${land}-${tag}.png` });
  console.log(tag, "page errors:", JSON.stringify(errors));
  await context.close();
}
await browser.close();
```

Open both screenshots and check: the four animals sit in a row on the lower bench and the four habitat pads in a row above; each animal and pad is recognisable and none is cut off, especially at 390 px; the mission card, guide bubble and "Your Hand" card do not cover the bench; the hand cursor is hidden while no hand is seen. Adjust model sizes, positions or `BENCH_WIDTH` in the set or scene, rebuild, and re-shoot until it reads well. The fake camera has no hand, so this checks the still view only. Stop the server afterwards.

- [ ] **Step 9: Commit**

```bash
git add apps/web/components/science/ScienceHandSession.tsx apps/web/components/science/ScienceHandSession.test.tsx apps/web/components/science/scienceActivities.ts apps/web/components/science/SciencePlanetCanvas.tsx
git commit -m "feat: play Animal Types camera-first on a 3D workbench"
```

---

### Task 7: Colors Canyon and Life Cycle Garden, then retire the old starter session

**Files:**
- Create: `apps/web/components/handActivity/sets/ColorSet.tsx`
- Create: `apps/web/components/handActivity/sets/LifeCycleSet.tsx`
- Modify: `apps/web/components/handActivity/sets/index.ts`
- Modify: `apps/web/components/science/SciencePlanetCanvas.tsx`
- Modify: `apps/web/components/science/scienceActivities.ts` and `scienceActivities.test.ts` (remove `StarterHandController` and its test)
- Delete: `apps/web/components/science/ScienceStarterSession.tsx`, `ScienceStarterSession.test.tsx`, `ScienceActivityModels.tsx`

**Interfaces:**
- Consumes: `BenchSet`, `ItemModelProps`, `PadProps` (Task 4); `Bench`, `Lift`, `PadFrame` (Task 5); `SCIENCE_ACTIVITIES` ids: `colors` items and targets `red | yellow | blue | purple`; `life-cycle` items `flower | seed | sprout`, targets `first | second | third`.
- Produces: `COLOR_SET`, `LIFE_CYCLE_SET: BenchSet`; `BENCH_SETS` gains `colors` and `"life-cycle"`.

Tasks 5 and 6 already test every registered set (`sets.test.ts`, `ScienceHandSession.test.tsx`), so registering the two new sets first makes those tests exercise them; they act as the failing tests for this task.

- [ ] **Step 1: Register the sets before they exist, and watch the tests fail**

Replace `apps/web/components/handActivity/sets/index.ts` with:

```ts
import type { BenchSet } from "../benchSet";
import { ANIMAL_SET } from "./AnimalSet";
import { COLOR_SET } from "./ColorSet";
import { LIFE_CYCLE_SET } from "./LifeCycleSet";

/** Each Science land's 3D set, keyed by land id. */
export const BENCH_SETS: Record<string, BenchSet | undefined> = {
  animals: ANIMAL_SET,
  colors: COLOR_SET,
  "life-cycle": LIFE_CYCLE_SET,
};
```

Run: `npx vitest run components/handActivity/sets/sets.test.ts`
Expected: FAIL, `Failed to resolve import "./ColorSet"`.

- [ ] **Step 2: Write the Colors Canyon set**

Create `apps/web/components/handActivity/sets/ColorSet.tsx`. Each crystal shows a coloured gem with a white symbol; each pedestal is a translucent disc in the same colour with the same symbol, so a child can match by colour and shape:

```tsx
import type { BenchSet, ItemModelProps, PadProps } from "../benchSet";
import { Bench, Lift, PadFrame } from "./setParts";

const COLORS: Record<string, string> = { red: "#ee6f7c", yellow: "#ffda65", blue: "#74c7f7", purple: "#bd94ef" };
/** A regular polygon from a circle with few segments: circle, triangle (point up), square, diamond. */
const SHAPES: Record<string, { sides: number; turn: number }> = {
  red: { sides: 32, turn: 0 },
  yellow: { sides: 3, turn: Math.PI / 2 },
  blue: { sides: 4, turn: Math.PI / 4 },
  purple: { sides: 4, turn: 0 },
};

function Glyph({ id, radius, z }: { id: string; radius: number; z: number }) {
  const shape = SHAPES[id];
  return <mesh position={[0, 0, z]} rotation={[0, 0, shape.turn]}>
    <circleGeometry args={[radius, shape.sides]} />
    <meshBasicMaterial color="#ffffff" />
  </mesh>;
}

function gem(id: string) {
  const Model = (props: ItemModelProps) => <Lift {...props}>
    <mesh><octahedronGeometry args={[.17, 0]} /><meshStandardMaterial color={COLORS[id]} roughness={.25} metalness={.1} flatShading /></mesh>
    <Glyph id={id} radius={.07} z={.19} />
  </Lift>;
  Model.displayName = `${id}Gem`;
  return Model;
}

function pedestal(id: string) {
  const Pad = (props: PadProps) => <PadFrame {...props}>
    <mesh rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[.22, .24, .06, 32]} /><meshStandardMaterial color={COLORS[id]} roughness={.5} transparent opacity={.6} /></mesh>
    <Glyph id={id} radius={.09} z={.05} />
  </PadFrame>;
  Pad.displayName = `${id}Pedestal`;
  return Pad;
}

const ITEM_Y = .28;
const TARGET_Y = .72;
const settle = { x: 0, y: 0 };

export const COLOR_SET: BenchSet = {
  land: "colors",
  label: "Colors Canyon workbench",
  items: [
    { id: "red", home: { x: .2, y: ITEM_Y }, radius: .09, Model: gem("red") },
    { id: "yellow", home: { x: .4, y: ITEM_Y }, radius: .09, Model: gem("yellow") },
    { id: "blue", home: { x: .6, y: ITEM_Y }, radius: .09, Model: gem("blue") },
    { id: "purple", home: { x: .8, y: ITEM_Y }, radius: .09, Model: gem("purple") },
  ],
  // Deliberately not in the crystals' order, so a child matches by colour and shape rather than by position.
  targets: [
    { id: "blue", at: { x: .15, y: TARGET_Y }, radius: .1, settle, Pad: pedestal("blue") },
    { id: "red", at: { x: .38, y: TARGET_Y }, radius: .1, settle, Pad: pedestal("red") },
    { id: "purple", at: { x: .62, y: TARGET_Y }, radius: .1, settle, Pad: pedestal("purple") },
    { id: "yellow", at: { x: .85, y: TARGET_Y }, radius: .1, settle, Pad: pedestal("yellow") },
  ],
  Scenery: () => <Bench color="#a5808f" />,
};
```

- [ ] **Step 3: Write the Life Cycle Garden set**

Create `apps/web/components/handActivity/sets/LifeCycleSet.tsx`. The three plots carry one, two and three yellow pips, so the order reads without numerals:

```tsx
import type { BenchSet, ItemModelProps, PadProps } from "../benchSet";
import { Bench, Lift, PadFrame } from "./setParts";

const Mat = ({ color }: { color: string }) => <meshStandardMaterial color={color} roughness={.65} />;

function Seed(props: ItemModelProps) {
  return <Lift {...props}>
    <mesh scale={[1, 1.4, .8]}><sphereGeometry args={[.09, 14, 10]} /><Mat color="#dbb37d" /></mesh>
    <mesh position={[0, 0, .07]} scale={[.15, 1, .3]}><sphereGeometry args={[.07, 8, 6]} /><Mat color="#b68b56" /></mesh>
  </Lift>;
}

function Sprout(props: ItemModelProps) {
  return <Lift {...props}>
    <mesh position={[0, -.03, 0]}><cylinderGeometry args={[.016, .022, .26, 8]} /><Mat color="#5fae5a" /></mesh>
    <mesh position={[-.09, .08, 0]} rotation={[0, 0, .7]} scale={[1.4, .6, .4]}><sphereGeometry args={[.07, 12, 8]} /><Mat color="#89d99d" /></mesh>
    <mesh position={[.09, .1, 0]} rotation={[0, 0, -.7]} scale={[1.4, .6, .4]}><sphereGeometry args={[.07, 12, 8]} /><Mat color="#89d99d" /></mesh>
    <mesh position={[0, -.17, 0]} scale={[1.2, .5, .8]}><sphereGeometry args={[.08, 12, 8]} /><Mat color="#7a5a3c" /></mesh>
  </Lift>;
}

function Flower(props: ItemModelProps) {
  return <Lift {...props}>
    <mesh position={[0, -.06, 0]}><cylinderGeometry args={[.018, .024, .34, 8]} /><Mat color="#4f9d4e" /></mesh>
    <mesh position={[-.09, -.08, 0]} rotation={[0, 0, .8]} scale={[1.3, .55, .4]}><sphereGeometry args={[.07, 12, 8]} /><Mat color="#6bc26a" /></mesh>
    <mesh position={[.09, -.02, 0]} rotation={[0, 0, -.8]} scale={[1.3, .55, .4]}><sphereGeometry args={[.07, 12, 8]} /><Mat color="#6bc26a" /></mesh>
    {Array.from({ length: 6 }, (_, index) => {
      const angle = (index / 6) * Math.PI * 2;
      return <mesh key={index} position={[Math.cos(angle) * .085, .14 + Math.sin(angle) * .085, 0]} scale={[1, 1, .6]}><sphereGeometry args={[.055, 12, 8]} /><Mat color="#f5a1b9" /></mesh>;
    })}
    <mesh position={[0, .14, .03]}><sphereGeometry args={[.05, 12, 10]} /><Mat color="#ffd45c" /></mesh>
  </Lift>;
}

function plot(pips: number) {
  const Pad = (props: PadProps) => <PadFrame {...props}>
    <mesh><circleGeometry args={[.25, 40]} /><meshStandardMaterial color="#7a5a3c" roughness={.95} /></mesh>
    {Array.from({ length: pips }, (_, index) => <mesh key={index} position={[(index - (pips - 1) / 2) * .1, .14, .04]}>
      <sphereGeometry args={[.035, 10, 8]} /><meshStandardMaterial color="#ffe17d" />
    </mesh>)}
  </PadFrame>;
  Pad.displayName = `Plot${pips}`;
  return Pad;
}

const ITEM_Y = .28;
const TARGET_Y = .72;
const settle = { x: 0, y: 0 };

export const LIFE_CYCLE_SET: BenchSet = {
  land: "life-cycle",
  label: "Life Cycle Garden workbench",
  // The lesson lists the flower first, so the stages start out of order on the bench.
  items: [
    { id: "flower", home: { x: .25, y: ITEM_Y }, radius: .09, Model: Flower },
    { id: "seed", home: { x: .5, y: ITEM_Y }, radius: .09, Model: Seed },
    { id: "sprout", home: { x: .75, y: ITEM_Y }, radius: .09, Model: Sprout },
  ],
  targets: [
    { id: "first", at: { x: .25, y: TARGET_Y }, radius: .1, settle, Pad: plot(1) },
    { id: "second", at: { x: .5, y: TARGET_Y }, radius: .1, settle, Pad: plot(2) },
    { id: "third", at: { x: .75, y: TARGET_Y }, radius: .1, settle, Pad: plot(3) },
  ],
  Scenery: () => <Bench color="#b89a63" />,
};
```

- [ ] **Step 4: Run the set and session tests**

Run: `npx vitest run components/handActivity components/science/ScienceHandSession.test.tsx`
Expected: PASS. `sets.test.ts` now runs three times (one per land) and the full-play session test runs for `animals`, `colors` and `life-cycle`.

- [ ] **Step 5: Switch every land to the hand session and remove the old code**

In `apps/web/components/science/SciencePlanetCanvas.tsx`:

1. Change `import type { StarterLand } from './scienceActivities';` to `import type { StarterLand, StarterProgress } from './scienceActivities';`.
2. Change `import { ScienceStarterSession, type StarterProgress } from './ScienceStarterSession';` by deleting that whole line.
3. Delete the line `import { BENCH_SETS } from '../handActivity/sets';` that Task 6 added.
4. Replace the whole conditional that Task 6 added (the `{starter ? (BENCH_SETS[starter] ? ... : ...) : null}` block) with:

```tsx
    {starter ? <ScienceHandSession key={starter} land={starter} progress={progress[starter]} onProgress={value => setProgress(previous => ({ ...previous, [starter]: value }))} onClose={close} /> : null}
```

Then, from `apps/web`, remove the old session and its helpers:

```bash
git rm components/science/ScienceStarterSession.tsx components/science/ScienceStarterSession.test.tsx components/science/ScienceActivityModels.tsx
python - <<'EOF'
p = "components/science/scienceActivities.ts"
s = open(p, encoding="utf-8").read()
i = s.index("/** A held item is released only by a positively tracked open palm")
open(p, "w", encoding="utf-8").write(s[:i].rstrip() + "\n")

p = "components/science/scienceActivities.test.ts"
s = open(p, encoding="utf-8").read()
s = s.replace("import { matchesActivity, SCIENCE_ACTIVITIES, StarterHandController } from './scienceActivities';", "import { matchesActivity, SCIENCE_ACTIVITIES } from './scienceActivities';")
i = s.index("it('never drops on ambiguous/lost tracking and cancels after grace'")
open(p, "w", encoding="utf-8").write(s[:i].rstrip() + "\n")
EOF
```

The controller behaviour those deleted tests covered is now tested in `handBenchController.test.ts` (Task 2).

- [ ] **Step 6: Confirm nothing still refers to the old code**

Run: `grep -rn "ScienceStarterSession\|StarterHandController\|ScienceActivityModels" components app tests e2e`
Expected: no matches, except the e2e spec text in `tests/browser/science-sessions.spec.ts`, which Task 8 replaces. (The `.module.css` file still holds unused starter classes; leaving them is harmless.)

- [ ] **Step 7: Typecheck, lint and run the science and hand-activity tests**

Run: `npx tsc --noEmit`, `npx eslint components/science components/handActivity`, then `npx vitest run components/science components/handActivity`
Expected: no typecheck or lint output; all tests pass.

- [ ] **Step 8: Visual check of the two new sets**

Rebuild and serve as in Task 6 Step 8, then run the same screenshot script for each new land: `node <path-to-script> colors <output-folder>` and `node <path-to-script> life-cycle <output-folder>`. Check at desktop and 390 px: four crystals with clearly different symbols and four pedestals with matching colour and symbol; the seed, sprout and flower are distinguishable and the three plots show one, two and three pips; nothing is cropped or hidden behind the mission card, guide or "Your Hand" card. Adjust and re-shoot until each reads well. Stop the server afterwards.

- [ ] **Step 9: Commit**

```bash
git add -A apps/web/components
git commit -m "feat: play Colors Canyon and Life Cycle Garden camera-first and retire the old starter session"
```

---

### Task 8: Browser tests, docs and full verification

**Files:**
- Modify: `apps/web/tests/browser/science-sessions.spec.ts` (replace the button-based starter test)
- Modify: `design-qa.md` (record what was and was not verified)

**Interfaces:**
- Consumes: `denyCamera(page)` and `acceptScienceInvitation(page, keyboard?)` from `tests/browser/helpers.ts`. `denyCamera` installs a `getUserMedia` that rejects with `NotAllowedError` and exposes `window.__magnetCameraCalls()`, a counter of how many times the camera was requested. `scienceLand(id).name`.
- Produces: a browser spec proving the camera is requested on entry, a blocked camera shows the adult screen with a working Try again, no button fallback exists for the activity, and Escape and layout behave.

- [ ] **Step 1: Replace the old browser test**

The existing first test clicks `Discover`, `Grab`, `Release here` and `Finish` buttons that no longer exist. In `apps/web/tests/browser/science-sessions.spec.ts`, run from `apps/web`:

```bash
python - <<'EOF'
p = "tests/browser/science-sessions.spec.ts"
s = open(p, encoding="utf-8").read()

s = s.replace("import { acceptScienceInvitation } from './helpers';", "import { acceptScienceInvitation, denyCamera } from './helpers';")
s = s.replace("import { SCIENCE_ACTIVITIES } from '../../components/science/scienceActivities';\n", "")

start = s.index("test('all lands invite, open with B or tap, and complete their own starter session'")
end = s.index("test('invitation dismissal, focus containment and Escape return'")
replacement = """test('the starter lands ask for the camera on entry and show adult help when it is blocked', async ({ page }, info) => {
  test.setTimeout(120000);
  await denyCamera(page);
  await page.goto('/?world=science');
  await expect(page.getByRole('region', { name: 'Science Planet', exact: true }).locator('canvas')).toBeVisible({ timeout: 10000 });
  const calls = () => page.evaluate(() => (window as unknown as { __magnetCameraCalls(): number }).__magnetCameraCalls());
  for (const land of ['animals', 'colors', 'life-cycle'] as const) {
    await page.getByRole('button', { name: `Visit ${scienceLand(land).name}`, exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    const before = await calls();
    await acceptScienceInvitation(page, land === 'animals');
    const dialog = page.getByRole('dialog', { name: `${scienceLand(land).name} activity session` });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('heading', { name: 'Ask an adult to turn on the camera' })).toBeVisible();
    expect(await calls()).toBeGreaterThan(before);
    await expect(dialog.getByRole('button', { name: /^(Discover|Grab|Next:|Finish) / })).toHaveCount(0);
    await dialog.getByRole('button', { name: 'Try again', exact: true }).click();
    await expect.poll(calls).toBeGreaterThan(before + 1);
    await page.screenshot({ path: info.outputPath(`${land}-adult-help-${info.project.name}.png`) });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByRole('region', { name: 'Science Planet', exact: true }).locator('canvas')).toBeVisible();
  }
});

"""
s = s[:start] + replacement + s[end:]
open(p, "w", encoding="utf-8").write(s)
EOF
```

- [ ] **Step 2: Typecheck, lint and list the spec**

Run: `npx tsc --noEmit` and `npx eslint tests` (expected: no output), then `npx playwright test tests/browser/science-sessions.spec.ts --list` (expected: the new test name and the untouched "invitation dismissal, focus containment and Escape return" test).

- [ ] **Step 3: Full unit, type and lint pass**

Run: `npx tsc --noEmit`, `npx eslint .`, then `npx vitest run --maxWorkers=3`
Expected: no typecheck or lint output; every test file passes. Record the file and test counts for `design-qa.md`.

- [ ] **Step 4: Rebuild and run the browser specs that touch Science**

From the repo root: `NODE_OPTIONS=--max-old-space-size=2048 npm run build --workspace=@wiggle/web`. Then from `apps/web`, in this order (each is its own command to keep memory use down):

```bash
npx playwright test tests/browser/science-sessions.spec.ts --project=desktop
npx playwright test tests/browser/science-sessions.spec.ts --project=mobile
npx playwright test tests/browser/science-walkaround.spec.ts tests/browser/magnet-lab-camera.spec.ts tests/browser/hover-contrast.spec.ts --project=desktop
npx playwright test tests/browser/subject-worlds.spec.ts --project=desktop
```

Expected: all pass. If `hover-contrast` fails on a Science control, the cause is the frame styles this work reused, not the sets; inspect the failing element before changing anything.

- [ ] **Step 5: Real-camera check (owner, on a device with a camera)**

Automated tests cannot exercise real hand tracking. Ask the owner to open each of the three lands with a real camera and confirm: the camera permission prompt appears on entry; the camera backdrop shows; pointing at an animal (or crystal, or plant stage) lifts it and Wiggle speaks its fact; after all are found the bench moves to matching; pinching picks an item up and it follows the hand; opening the palm over the right target settles it with a sparkle, over a wrong target it hops back; covering the camera for more than half a second puts a held item back without scoring; denying the camera shows the "Ask an adult" screen and Try again works. Record the result in `design-qa.md` as either confirmed or not yet checked.

- [ ] **Step 6: Record what was verified**

Add this section to `design-qa.md`, directly above the heading `## Subject Worlds and Science Planet — Task 8 verification`, filling in the counts from Steps 3 and 4 and the outcome of Step 5:

```markdown
## Camera-first Science lands — <date>

result: automated checks pass; real-camera play is <confirmed by the owner on <device> | not yet checked>.

Animal Types, Colors Canyon and Life Cycle Garden now open the camera on entry and are played only with the hand on a 3D workbench inside the Magnet-style frame (`components/handActivity/`). The camera is required: a blocked or missing camera shows "Ask an adult to turn on the camera" with Try again, and there is no button fallback for the activity. Keyboard-only and touch-only players cannot complete these three activities; Escape and the exit button still work. Magnet Lands is unchanged.

Checked: <N> web unit files / <M> tests pass, including the pure engine and controller, the shell, a full discover-match-done play for each land with simulated hand actions, and a per-set consistency test against the lesson data. Browser: the science-sessions spec (camera requested on entry, adult help and Try again, no button fallback, Escape, no horizontal scroll) passes at desktop and 390 px, and the science walk-around, magnet-lab-camera, hover-contrast and subject-worlds specs still pass. The 3D sets were inspected in screenshots at 1440 x 900 and 390 x 844.

Not verifiable automatically: real hand tracking (pinch, point, open palm, tracking-loss grace). Numeria's Number Valley, Geometry Ridge and Crystal Crater are unchanged and are the next round.
```

- [ ] **Step 7: Commit**

```bash
git add apps/web/tests/browser/science-sessions.spec.ts design-qa.md
git commit -m "test: cover the camera-first Science lands and record the verification"
```

Do not push unless the owner asks.

---

## Self-review

- **Spec coverage:** shared frame (Task 3); pure engine and hand rules including the 400 ms grace (Tasks 1, 2); shared 3D scene with cursor, held item, hover, shake and sparkle (Task 4); three custom sets (Tasks 5, 7); session wiring, progress contract and removal of the old path (Tasks 6, 7); adult-help screen, Try again, Escape, focus, reduced motion (Tasks 3, 4, 6); testing at unit, component, browser and visual levels plus the manual real-camera step (Tasks 1 to 8); documentation (Task 8). Numeria and the Magnet refactor are out of scope by design.
- **Type consistency:** `BenchAction`, `BenchPhase`, `BenchState`, `BenchRules`, `BenchPoint`, `BenchZone` (Task 1) are used unchanged by the controller, frame adapters, scene and session. `HandActivityShellProps` and `HandActivitySceneContext` (Task 3) match the session's use. `BenchSet`, `ItemModelProps`, `PadProps` (Task 4) match every set. `StarterProgress` lives in `scienceActivities.ts` from Task 6 onward.
- **Placeholders:** none; every code step contains the code. The `<date>`, `<N>`, `<M>` and device markers in the `design-qa.md` template are filled in from real results at that step, and the step says so.

## Execution notes

- Task 3: progress indicator gets role="img", and "off" counts as adult help only after the camera has left "off" (the hook's first render is always "off"); both changes are now in the plan text above.
- Task 4: the wrong-answer wobble in the scene only follows a drop the scene itself emitted, never a cancel.
- Task 6: the session unlocks its own sound instance on mount, and keeps its state reference authoritative between renders (`stateRef.current = after` after dispatch and in the auto-advance timer); `SciencePlanetCanvas.test.tsx` had one assertion of the removed "Discover Frog" button changed to check the new "Animal Types activity" region.
- Visual polish after looking at screenshots: the bench camera now fits the bench to at most 68% of the canvas height and 92% of its width (was a fixed 5.3 minimum distance); the fish tail rotation is -PI/2 and the frog smile z is .19; the Colors Canyon pedestals are opaque and the bench colour is #4d4266.
- Known follow-ups (minor, deferred): the `Mat`/`Dark` helpers and row constants are duplicated across the three sets; `benchX`/`benchY` and the bench extents live in the scene file; the controller is phase-unaware and relies on its caller to reset it; Magnet Lands has the same initial-"off" behaviour the shell now avoids and was deliberately left untouched.
