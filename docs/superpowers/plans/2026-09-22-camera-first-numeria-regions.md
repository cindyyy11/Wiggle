# Camera-First Numeria Regions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Number Valley, Geometry Ridge and Crystal Crater play like Magnet Lands and the Science lands: the camera opens on entry and each puzzle is answered with the hand (point and hold) on a custom 3D workbench.

**Architecture:** Reuse the Round 1 camera frame (`HandActivityShell`) and hand helpers. Extract the 3D canvas plumbing out of `HandBenchScene` into `BenchCanvas`/`benchSpace`, add a pure dwell selector and a pure puzzle reducer, a new `AnswerBenchScene`, and one 3D set per region. `MathHandSession` wires them from the unchanged `MATH_ACTIVITIES` data and replaces the radio-button `MathActivitySession` in `MathPlanetCanvas`.

**Tech Stack:** Next.js 15 / React 19, TypeScript, React Three Fiber + three, Vitest (jsdom), Playwright, CSS Modules. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-09-22-camera-first-numeria-regions-design.md`

## Global Constraints

- Camera required. If it cannot open (denied, unavailable, none) show the "Ask an adult to turn on the camera" screen with **Try again**. There is no button, keyboard or touch fallback for answering.
- Point and hold: any confidently tracked hand pointer over an answer token fills a ring over `DWELL_MS` (1200 ms); leaving the token resets it after a `LEAVE_GRACE_MS` (300 ms) allowance; losing the hand resets it immediately and never chooses an answer; only a ring that fully fills counts. After `CELEBRATE_MS` (1500 ms) the next puzzle appears.
- The `MATH_ACTIVITIES` content (prompts, hints, options, answers) is unchanged and stays the source of truth. Fraction Forest's real mission and Magnet Lands are not modified.
- Camera frames and inference stay on the device. No new services, uploads or dependencies. No font downloads: numbers are drawn with canvas textures.
- Reduced motion: no wobble or sparkle and near-instant easing; the ring still fills.
- Escape and the exit button work; focus returns to the entry control. No horizontal scroll at 390 px.
- Progress inside a region is not saved (leaving restarts it), as today. Completing all three puzzles calls the existing `onComplete(region)` path.
- Commit messages use conventional prefixes and carry **no** `Co-Authored-By` or Claude trailers.
- All commands run from `apps/web` unless stated. Unit tests: `npx vitest run <file>`. Typecheck: `npx tsc --noEmit`. Lint: `npx eslint <paths>`.
- The machine is memory-tight: build with `NODE_OPTIONS=--max-old-space-size=2048 npm run build --workspace=@wiggle/web` from the repo root, and run browser specs in small batches. Playwright serves the existing `.next` build and never rebuilds, so rebuild before browser runs.

---

## File Structure

| File | Responsibility |
| --- | --- |
| `apps/web/components/handActivity/benchSpace.ts` | Bench coordinates (`benchX`, `benchY`, extents) and the pure `benchCameraDistance`. Extracted from `HandBenchScene`. |
| `apps/web/components/handActivity/BenchCanvas.tsx` | R3F canvas plumbing: WebGL probe, error boundary, camera fit, lights. Extracted from `HandBenchScene`. |
| `apps/web/components/handActivity/MatchBurst.tsx` | The sparkle ring shown when an answer is right. Extracted from `HandBenchScene` so both scenes share it. |
| `apps/web/components/handActivity/dwellSelect.ts` | Pure point-and-hold selector (`DwellSelector`). |
| `apps/web/components/handActivity/answerPlay.ts` | Pure reducer for a region's puzzles: asking, celebrating, done. |
| `apps/web/components/handActivity/handBenchFrame.ts` | Modified: gains `answerStatusForFrame`. |
| `apps/web/components/handActivity/answerSet.ts` | Types for a region's 3D set (`AnswerSet`, `PuzzleProps`, `TokenProps`). |
| `apps/web/components/handActivity/answerSets/NumberPlate.tsx` | Draws a number onto a canvas texture and shows it on a plane (`NumberPlate`). |
| `apps/web/components/handActivity/answerSets/GemToken.tsx` | The shared answer-token look: a gem with a `NumberPlate` on it. |
| `apps/web/components/handActivity/answerSets/puzzleLayout.ts` | Pure layout helpers: stone trail, polygon points, crystal groups. |
| `apps/web/components/handActivity/answerSets/NumberValleySet.tsx`, `GeometryRidgeSet.tsx`, `CrystalCraterSet.tsx` | One 3D set per region. |
| `apps/web/components/handActivity/answerSets/index.ts` | `ANSWER_SETS` registry and the `MathHandRegion` type. |
| `apps/web/components/handActivity/AnswerBenchScene.tsx` | The answer scene: puzzle, tokens with dwell rings, cursor, wobble, sparkle. |
| `apps/web/components/math/MathHandSession.tsx` | Wires shell, scene and reducers for one region. |
| `apps/web/components/math/MathPlanetCanvas.tsx` | Modified: opens `MathHandSession`. |
| `apps/web/components/math/mathPlanet.module.css` | Modified: a dark full-screen overlay class replaces the old light quiz overlay. |

Removed in Task 7: `MathActivitySession.tsx`, `MathActivitySession.module.css`, `MathActivitySession.test.tsx`, `tests/browser/activity-session-focus.spec.ts`.

---

### Task 1: Extract the canvas plumbing and bench space

**Files:**
- Create: `apps/web/components/handActivity/benchSpace.ts`
- Test: `apps/web/components/handActivity/benchSpace.test.ts`
- Create: `apps/web/components/handActivity/BenchCanvas.tsx`
- Create: `apps/web/components/handActivity/MatchBurst.tsx`
- Modify: `apps/web/components/handActivity/HandBenchScene.tsx`
- Modify: `apps/web/components/handActivity/sets/setParts.tsx` (the `Bench` slab uses the named extents)

This is a behaviour-preserving refactor: the Round 1 scene must render and behave exactly as before, and every Round 1 test must stay green.

**Interfaces:**
- Produces: `MatchBurst(props: { x: number; y: number; onDone(): void })` from `MatchBurst.tsx` (the sparkle ring, moved unchanged out of `HandBenchScene`); from `benchSpace.ts`: `BENCH_WIDTH = 2.8`, `BENCH_HEIGHT = 1.7`, `BENCH_SLAB_WIDTH = 3.1`, `BENCH_SLAB_HEIGHT = 1.95`, `FIELD_OF_VIEW = 42`, `benchX(x)`, `benchY(y)`, `benchCameraDistance(aspect)`. From `BenchCanvas.tsx`: `BenchCanvas(props: { label: string; reducedMotion: boolean; failureMessage: string; onFailure(message: string): void; children: ReactNode })`.
- Consumes: nothing new.

- [ ] **Step 1: Write the failing test**

Create `apps/web/components/handActivity/benchSpace.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  BENCH_HEIGHT,
  BENCH_SLAB_HEIGHT,
  BENCH_SLAB_WIDTH,
  BENCH_WIDTH,
  FIELD_OF_VIEW,
  benchCameraDistance,
  benchX,
  benchY,
} from "./benchSpace";

describe("bench coordinates", () => {
  it("centres 0.5 and spans the bench extents", () => {
    expect(benchX(.5)).toBe(0);
    expect(benchY(.5)).toBe(0);
    expect(benchX(1)).toBeCloseTo(BENCH_WIDTH / 2);
    expect(benchX(0)).toBeCloseTo(-BENCH_WIDTH / 2);
    expect(benchY(1)).toBeCloseTo(BENCH_HEIGHT / 2);
    expect(benchY(0)).toBeCloseTo(-BENCH_HEIGHT / 2);
  });

  it("keeps the movable area inside the slab it sits on", () => {
    expect(BENCH_SLAB_WIDTH).toBeGreaterThan(BENCH_WIDTH);
    expect(BENCH_SLAB_HEIGHT).toBeGreaterThan(BENCH_HEIGHT);
  });
});

describe("benchCameraDistance", () => {
  it("matches the distances checked in Round 1 for a desktop, phone, very wide and very narrow canvas", () => {
    expect(benchCameraDistance(1.67)).toBeCloseTo(3.735, 2);
    expect(benchCameraDistance(3)).toBeCloseTo(3.735, 2);
    expect(benchCameraDistance(.83)).toBeCloseTo(5.29, 1);
    expect(benchCameraDistance(.4)).toBeCloseTo(10.97, 0);
  });

  it("never lets the slab fill more than 68% of the height or 92% of the width", () => {
    const halfFov = Math.tan((FIELD_OF_VIEW * Math.PI) / 360);
    for (let aspect = .3; aspect <= 4; aspect += .1) {
      const visibleHeight = 2 * halfFov * benchCameraDistance(aspect);
      const visibleWidth = visibleHeight * aspect;
      expect(BENCH_SLAB_HEIGHT / visibleHeight).toBeLessThanOrEqual(.68 + 1e-9);
      expect(BENCH_SLAB_WIDTH / visibleWidth).toBeLessThanOrEqual(.92 + 1e-9);
    }
  });

  it("stays finite for a degenerate canvas", () => {
    expect(Number.isFinite(benchCameraDistance(0))).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run components/handActivity/benchSpace.test.ts`
Expected: FAIL, `Failed to resolve import "./benchSpace"`.

- [ ] **Step 3: Write `benchSpace.ts`**

Create `apps/web/components/handActivity/benchSpace.ts`:

```ts
/** The area items can be moved over, in world units. Bench coordinates run 0 to 1 across it, y up. */
export const BENCH_WIDTH = 2.8;
export const BENCH_HEIGHT = 1.7;
/** The slab the lesson sits on is a little larger than the movable area. */
export const BENCH_SLAB_WIDTH = 3.1;
export const BENCH_SLAB_HEIGHT = 1.95;
export const FIELD_OF_VIEW = 42;

export const benchX = (x: number) => (x - .5) * BENCH_WIDTH;
export const benchY = (y: number) => (y - .5) * BENCH_HEIGHT;

const HEIGHT_SHARE = .68;
const WIDTH_SHARE = .92;

/**
 * How far the camera sits from the bench so the slab fills at most 68% of the canvas height and 92% of its width,
 * whatever the canvas shape.
 */
export function benchCameraDistance(aspect: number): number {
  const halfFov = Math.tan((FIELD_OF_VIEW * Math.PI) / 360);
  return Math.max(
    BENCH_SLAB_HEIGHT / (HEIGHT_SHARE * 2 * halfFov),
    BENCH_SLAB_WIDTH / (WIDTH_SHARE * 2 * halfFov * Math.max(aspect, .01)),
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run components/handActivity/benchSpace.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Create `BenchCanvas.tsx`**

Create `apps/web/components/handActivity/BenchCanvas.tsx`. This is the WebGL probe, error boundary, camera fit and lighting that `HandBenchScene` currently holds, unchanged in behaviour:

```tsx
"use client";

import { Component, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { FIELD_OF_VIEW, benchCameraDistance } from "./benchSpace";

/** Keeps the whole bench in view on any canvas shape by moving the camera back. */
function FitBench() {
  const { camera, size } = useThree();
  useEffect(() => {
    camera.position.z = benchCameraDistance(size.width / Math.max(1, size.height));
    camera.updateProjectionMatrix();
  }, [camera, size]);
  return null;
}

class GraphicsBoundary extends Component<{ children: ReactNode; onFailure(): void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onFailure(); }
  render() { return this.state.failed ? null : this.props.children; }
}

export type BenchCanvasProps = {
  /** Accessible name of the 3D view. */
  label: string;
  reducedMotion: boolean;
  /** Reported once, through `onFailure`, if WebGL is unavailable or the scene throws. */
  failureMessage: string;
  onFailure(message: string): void;
  children: ReactNode;
};

/** The shared 3D canvas for hand-played benches: checks WebGL first, then draws the lit, camera-fitted scene. */
export function BenchCanvas({ label, reducedMotion, failureMessage, onFailure, children }: BenchCanvasProps) {
  const [webglSupported, setWebglSupported] = useState<boolean | null>(null);
  const reported = useRef(false);
  const report = useRef(onFailure);
  report.current = onFailure;
  const message = useRef(failureMessage);
  message.current = failureMessage;
  const reportFailure = useCallback(() => {
    if (reported.current) return;
    reported.current = true;
    setWebglSupported(false);
    report.current(message.current);
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
      aria-label={label}
      aria-hidden="true"
      style={{ display: "block", width: "100%", height: "100%", minHeight: 320, background: "transparent" }}
      camera={{ position: [0, 0, 5.3], fov: FIELD_OF_VIEW, near: .1, far: 30 }}
      dpr={reducedMotion ? 1 : [1, 1.5]}
      gl={{ antialias: !reducedMotion, alpha: true, powerPreference: "low-power", failIfMajorPerformanceCaveat: true }}
    >
      <ambientLight intensity={1.45} color="#f7e7c5" />
      <hemisphereLight args={["#fff0d4", "#3e4664", 1.1]} />
      <directionalLight position={[-3, 4, 5]} intensity={2.2} color="#ffd991" />
      <pointLight position={[1.4, 1.1, 2]} intensity={6} distance={6} color="#f39b83" />
      <FitBench />
      {children}
    </Canvas>
  </GraphicsBoundary>;
}
```

- [ ] **Step 5b: Create `MatchBurst.tsx`**

Create `apps/web/components/handActivity/MatchBurst.tsx`. This is the sparkle ring currently inside `HandBenchScene.tsx`, moved as it is and exported:

```tsx
"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";

/** A short ring of sparkles where an item has just been matched or an answer chosen correctly. */
export function MatchBurst({ x, y, onDone }: { x: number; y: number; onDone(): void }) {
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
```

- [ ] **Step 6: Make `HandBenchScene` use them**

From `apps/web`, run this script. It swaps the header block (imports, props type and constants) for one that imports `benchX`/`benchY` from `benchSpace`, removes the now-extracted `FitBench`, `MatchBurst`, `GraphicsBoundary` and canvas wrapper, and replaces the exported scene with a thin wrapper around `BenchCanvas`:

```bash
python - <<'EOF'
p = "components/handActivity/HandBenchScene.tsx"
s = open(p, encoding="utf-8").read()

# 1. Header: imports, props type and constants.
head_end = s.index("/** Sizes the camera so the bench")
new_head = '''"use client";

import { useRef, useState, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group, Mesh } from "three";
import type { HandTrackingLatest } from "../../features/gestures/useHandTracking";
import type { BenchSet } from "./benchSet";
import { benchX, benchY } from "./benchSpace";
import { BenchCanvas } from "./BenchCanvas";
import { MatchBurst } from "./MatchBurst";
import { HandBenchController } from "./handBenchController";
import { benchStatusForFrame, staleHoldToCancel, trackedBenchPoint } from "./handBenchFrame";
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

const TARGET_Z = .1;
const REST_Z = .3;
const HELD_Z = .6;

'''
s = new_head + s[head_end:]

# 2. Drop FitBench and MatchBurst (both are now their own files): everything from the FitBench
#    doc comment up to the start of BenchInteraction.
a = s.index("/** Sizes the camera so the bench")
b = s.index("function BenchInteraction(")
s = s[:a] + s[b:]

# 3. Replace the boundary class and the exported scene with a thin wrapper.
c = s.index("class GraphicsBoundary")
s = s[:c] + '''export function HandBenchScene(props: HandBenchSceneProps) {
  return <BenchCanvas
    label={props.set.label}
    reducedMotion={props.reducedMotion}
    failureMessage="The workbench needs a graphics-capable device."
    onFailure={props.onHandStatus}
  >
    <BenchInteraction {...props} />
  </BenchCanvas>;
}
'''
open(p, "w", encoding="utf-8").write(s)
EOF
```

Then update the slab in `apps/web/components/handActivity/sets/setParts.tsx`: add `import { BENCH_SLAB_HEIGHT, BENCH_SLAB_WIDTH } from "../benchSpace";` under the existing imports and change `<boxGeometry args={[3.1, 1.95, .12]} />` to `<boxGeometry args={[BENCH_SLAB_WIDTH, BENCH_SLAB_HEIGHT, .12]} />`.

If `eslint` or `tsc` then reports an unused import in `HandBenchScene.tsx` (for example `useState` or `useRef`, if the remaining code does not use them), remove exactly the unused names. Do not change any other logic in that file.

- [ ] **Step 7: Typecheck, lint, and run every Round 1 test**

Run: `npx tsc --noEmit`, then `npx eslint components/handActivity`, then `npx vitest run components/handActivity components/science`
Expected: no typecheck or lint output; all tests pass (the Round 1 handActivity and science suites plus the new `benchSpace` tests).

- [ ] **Step 8: Visual check (controller)**

The controller rebuilds, opens Animal Types with the fake-camera screenshot script at 1440 x 900 and 390 x 844, and confirms the bench looks identical to before the refactor (same size and placement, no page errors). The implementer does not run this step.

- [ ] **Step 9: Commit**

```bash
git add apps/web/components/handActivity/benchSpace.ts apps/web/components/handActivity/benchSpace.test.ts apps/web/components/handActivity/BenchCanvas.tsx apps/web/components/handActivity/MatchBurst.tsx apps/web/components/handActivity/HandBenchScene.tsx apps/web/components/handActivity/sets/setParts.tsx
git commit -m "refactor: extract the bench canvas, bench space and sparkle burst so a second scene can reuse them"
```

---

### Task 2: The point-and-hold selector

**Files:**
- Create: `apps/web/components/handActivity/dwellSelect.ts`
- Test: `apps/web/components/handActivity/dwellSelect.test.ts`

**Interfaces:**
- Produces: `DWELL_MS = 1200`, `LEAVE_GRACE_MS = 300`; `type DwellInput = { over: string | null; isTracking: boolean; enabled: boolean; at: number }`; `type DwellOutput = { id: string | null; progress: number; selected: string | null }`; `class DwellSelector { update(input: DwellInput): DwellOutput; reset(): void }`. `over` is the id of the token under the hand (or null), `at` is a monotonic time in milliseconds, `progress` is the ring fill from 0 to 1 for the token being held (`id`), and `selected` is the id that has just been chosen, on exactly one update.
- Consumes: nothing.

- [ ] **Step 1: Write the failing test**

Create `apps/web/components/handActivity/dwellSelect.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { DWELL_MS, DwellSelector, LEAVE_GRACE_MS, type DwellInput } from "./dwellSelect";

const frame = (over: string | null, at: number, patch: Partial<DwellInput> = {}): DwellInput => ({ over, at, isTracking: true, enabled: true, ...patch });
const idle = { id: null, progress: 0, selected: null };

describe("DwellSelector", () => {
  it("has nothing to show before a hand is over a token", () => {
    expect(new DwellSelector().update(frame(null, 0))).toEqual(idle);
  });

  it("fills a ring while the hand stays on a token, and chooses it once when the ring is full", () => {
    const selector = new DwellSelector();
    expect(selector.update(frame("a", 0))).toEqual({ id: "a", progress: 0, selected: null });
    const half = selector.update(frame("a", DWELL_MS / 2));
    expect(half.progress).toBeCloseTo(.5);
    expect(half.selected).toBeNull();
    expect(selector.update(frame("a", DWELL_MS))).toEqual({ id: "a", progress: 1, selected: "a" });
  });

  it("does not choose the same token again until the hand has left it", () => {
    const selector = new DwellSelector();
    selector.update(frame("a", 0));
    expect(selector.update(frame("a", DWELL_MS)).selected).toBe("a");
    expect(selector.update(frame("a", DWELL_MS + 50))).toEqual(idle);
    expect(selector.update(frame("a", DWELL_MS * 3))).toEqual(idle);
    expect(selector.update(frame(null, DWELL_MS * 3 + 10))).toEqual(idle);
    expect(selector.update(frame("a", DWELL_MS * 3 + 20))).toEqual({ id: "a", progress: 0, selected: null });
    expect(selector.update(frame("a", DWELL_MS * 4 + 20)).selected).toBe("a");
  });

  it("starts a new ring from nothing when the hand moves straight to another token", () => {
    const selector = new DwellSelector();
    selector.update(frame("a", 0));
    expect(selector.update(frame("a", 900)).progress).toBeCloseTo(.75);
    expect(selector.update(frame("b", 1000))).toEqual({ id: "b", progress: 0, selected: null });
    expect(selector.update(frame("b", 1000 + DWELL_MS)).selected).toBe("b");
  });

  it("forgives a shaky hand: a short trip off the token keeps the ring, and the time away does not count", () => {
    const selector = new DwellSelector();
    selector.update(frame("a", 0));
    selector.update(frame("a", 600));
    const away = selector.update(frame(null, 700));
    expect(away.id).toBe("a");
    expect(away.progress).toBeCloseTo(700 / DWELL_MS);
    const back = selector.update(frame("a", 900));
    expect(back.progress).toBeCloseTo(700 / DWELL_MS);
    expect(selector.update(frame("a", 900 + DWELL_MS - 700)).selected).toBe("a");
  });

  it("never chooses anything while the hand is off the token", () => {
    const selector = new DwellSelector();
    selector.update(frame("a", 0));
    selector.update(frame("a", 1100));
    const away = selector.update(frame(null, 1150));
    expect(away.selected).toBeNull();
    expect(away.progress).toBeLessThan(1);
  });

  it("resets the ring once the hand has been away longer than the allowance", () => {
    const selector = new DwellSelector();
    selector.update(frame("a", 0));
    selector.update(frame("a", 600));
    selector.update(frame(null, 700));
    expect(selector.update(frame(null, 700 + LEAVE_GRACE_MS))).toEqual(idle);
    expect(selector.update(frame("a", 1400))).toEqual({ id: "a", progress: 0, selected: null });
  });

  it("resets immediately when the hand is lost, and never chooses", () => {
    const selector = new DwellSelector();
    selector.update(frame("a", 0));
    selector.update(frame("a", 1100));
    expect(selector.update(frame("a", 1300, { isTracking: false }))).toEqual(idle);
    expect(selector.update(frame("a", 1400))).toEqual({ id: "a", progress: 0, selected: null });
  });

  it("does nothing, and forgets any ring, while disabled", () => {
    const selector = new DwellSelector();
    selector.update(frame("a", 0));
    selector.update(frame("a", 600));
    expect(selector.update(frame("a", 700, { enabled: false }))).toEqual(idle);
    expect(selector.update(frame("a", 800))).toEqual({ id: "a", progress: 0, selected: null });
  });

  it("can be reset explicitly", () => {
    const selector = new DwellSelector();
    selector.update(frame("a", 0));
    selector.update(frame("a", 900));
    selector.reset();
    expect(selector.update(frame("a", 1000))).toEqual({ id: "a", progress: 0, selected: null });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run components/handActivity/dwellSelect.test.ts`
Expected: FAIL, `Failed to resolve import "./dwellSelect"`.

- [ ] **Step 3: Write the implementation**

Create `apps/web/components/handActivity/dwellSelect.ts`:

```ts
/** How long a hand must stay over an answer token for it to be chosen. */
export const DWELL_MS = 1200;
/** How long a hand may drift off a token before its ring resets, so a shaky hand is forgiven. */
export const LEAVE_GRACE_MS = 300;

export type DwellInput = {
  /** The token under the hand, or null. */
  over: string | null;
  /** False when no hand is confidently seen; the ring resets at once. */
  isTracking: boolean;
  /** False when nothing may be chosen right now (for example while celebrating). */
  enabled: boolean;
  /** Milliseconds, monotonic. */
  at: number;
};

export type DwellOutput = {
  /** The token whose ring is filling, or null. */
  id: string | null;
  /** Ring fill from 0 to 1. */
  progress: number;
  /** The token that has just been chosen; set on exactly one update. */
  selected: string | null;
};

const IDLE: DwellOutput = { id: null, progress: 0, selected: null };

/**
 * Point and hold. A ring fills while the hand stays over one token; a full ring chooses it. Losing the hand resets the
 * ring and never chooses anything. After a choice the same token cannot be chosen again until the hand has left it.
 */
export class DwellSelector {
  private id: string | null = null;
  private startedAt = 0;
  private leftAt: number | null = null;
  private locked: string | null = null;

  reset() {
    this.id = null;
    this.leftAt = null;
    this.locked = null;
  }

  update({ over, isTracking, enabled, at }: DwellInput): DwellOutput {
    if (!enabled || !isTracking) { this.reset(); return IDLE; }

    if (this.locked !== null) {
      if (over === this.locked) return IDLE;
      this.locked = null;
    }

    if (over !== null && over !== this.id) {
      this.id = over;
      this.startedAt = at;
      this.leftAt = null;
    } else if (over !== null) {
      if (this.leftAt !== null) { this.startedAt += at - this.leftAt; this.leftAt = null; }
    } else if (this.id !== null) {
      this.leftAt ??= at;
      if (at - this.leftAt >= LEAVE_GRACE_MS) { this.reset(); return IDLE; }
    }

    if (this.id === null) return IDLE;
    const now = this.leftAt ?? at;
    const progress = Math.min(1, Math.max(0, (now - this.startedAt) / DWELL_MS));
    if (progress >= 1 && this.leftAt === null) {
      const id = this.id;
      this.locked = id;
      this.id = null;
      return { id, progress: 1, selected: id };
    }
    return { id: this.id, progress, selected: null };
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run components/handActivity/dwellSelect.test.ts`
Expected: PASS (10 tests).

- [ ] **Step 5: Typecheck, lint and commit**

Run: `npx tsc --noEmit` and `npx eslint components/handActivity` (expected: no output).

```bash
git add apps/web/components/handActivity/dwellSelect.ts apps/web/components/handActivity/dwellSelect.test.ts
git commit -m "feat: add the point-and-hold selector for answer tokens"
```

---

### Task 3: The puzzle reducer and answer status text

**Files:**
- Create: `apps/web/components/handActivity/answerPlay.ts`
- Test: `apps/web/components/handActivity/answerPlay.test.ts`
- Modify: `apps/web/components/handActivity/handBenchFrame.ts` (add `answerStatusForFrame`)
- Modify: `apps/web/components/handActivity/handBenchFrame.test.ts` (test it)

**Interfaces:**
- Produces: `type AnswerPhase = "asking" | "celebrating" | "done"`; `type AnswerState = { index: number; solved: number; phase: AnswerPhase }`; `type AnswerRules = { answers: readonly string[] }` (the correct option for each puzzle, in order); `type AnswerAction = { type: "select"; option: string } | { type: "advance" }`; `initialAnswerState`; `answerReducer(rules, state, action): AnswerState`; and in `handBenchFrame.ts` `answerStatusForFrame(phase: AnswerPhase, tracked: boolean): string`.
- A wrong `select` returns the very same state object, so a caller can tell a wrong answer (the state did not change while `phase` was `"asking"`) from a correct one.
- Consumes: nothing new.

- [ ] **Step 1: Write the failing reducer test**

Create `apps/web/components/handActivity/answerPlay.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { answerReducer, initialAnswerState, type AnswerAction, type AnswerRules, type AnswerState } from "./answerPlay";

const rules: AnswerRules = { answers: ["6", "6", "5"] };
const run = (state: AnswerState, ...actions: AnswerAction[]) => actions.reduce((next, action) => answerReducer(rules, next, action), state);
const select = (option: string): AnswerAction => ({ type: "select", option });
const advance: AnswerAction = { type: "advance" };

describe("answerReducer", () => {
  it("starts on the first puzzle, asking", () => {
    expect(initialAnswerState).toEqual({ index: 0, solved: 0, phase: "asking" });
  });

  it("leaves the state exactly as it was for a wrong answer, so the caller can tell", () => {
    expect(run(initialAnswerState, select("7"))).toBe(initialAnswerState);
    expect(run(initialAnswerState, select("not an option"))).toBe(initialAnswerState);
  });

  it("celebrates a right answer and counts it", () => {
    expect(run(initialAnswerState, select("6"))).toEqual({ index: 0, solved: 1, phase: "celebrating" });
  });

  it("ignores further answers while celebrating, so a puzzle is only counted once", () => {
    const celebrating = run(initialAnswerState, select("6"));
    expect(run(celebrating, select("6"))).toBe(celebrating);
  });

  it("moves to the next puzzle only after celebrating", () => {
    expect(run(initialAnswerState, advance)).toBe(initialAnswerState);
    expect(run(initialAnswerState, select("6"), advance)).toEqual({ index: 1, solved: 1, phase: "asking" });
  });

  it("judges each puzzle against its own answer", () => {
    const second = run(initialAnswerState, select("6"), advance);
    expect(run(second, select("5"))).toBe(second);
    expect(run(second, select("6")).solved).toBe(2);
  });

  it("finishes after the last puzzle is solved and advanced", () => {
    const done = run(initialAnswerState, select("6"), advance, select("6"), advance, select("5"), advance);
    expect(done).toEqual({ index: 2, solved: 3, phase: "done" });
  });

  it("ignores everything once done", () => {
    const done = run(initialAnswerState, select("6"), advance, select("6"), advance, select("5"), advance);
    expect(run(done, select("5"))).toBe(done);
    expect(run(done, advance)).toBe(done);
  });
});
```

- [ ] **Step 2: Write the failing status-text test**

Append to `apps/web/components/handActivity/handBenchFrame.test.ts`. First add `answerStatusForFrame` to its existing import from `./handBenchFrame` (keep the names already imported), then add at the end of the file:

```ts
describe("answerStatusForFrame", () => {
  it("asks for a hand when none is seen, and gives one instruction while asking", () => {
    expect(answerStatusForFrame("asking", false)).toBe("Show your hand to the camera.");
    expect(answerStatusForFrame("asking", true)).toBe("Hold your hand over an answer.");
  });

  it("celebrates and finishes without needing a hand", () => {
    expect(answerStatusForFrame("celebrating", false)).toBe("Well done!");
    expect(answerStatusForFrame("celebrating", true)).toBe("Well done!");
    expect(answerStatusForFrame("done", false)).toBe("All done!");
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx vitest run components/handActivity/answerPlay.test.ts components/handActivity/handBenchFrame.test.ts`
Expected: FAIL: `./answerPlay` cannot be resolved, and `answerStatusForFrame` is not exported.

- [ ] **Step 4: Write the reducer**

Create `apps/web/components/handActivity/answerPlay.ts`:

```ts
export type AnswerPhase = "asking" | "celebrating" | "done";
export type AnswerState = { index: number; solved: number; phase: AnswerPhase };
/** The correct option for each puzzle, in order. Wrong options are anything else. */
export type AnswerRules = { answers: readonly string[] };
export type AnswerAction = { type: "select"; option: string } | { type: "advance" };

export const initialAnswerState: AnswerState = { index: 0, solved: 0, phase: "asking" };

/**
 * One region's puzzles, one after another. A wrong answer returns the same state object, so a caller can tell it from a
 * right one; only a right answer counts, and only once per puzzle.
 */
export function answerReducer(rules: AnswerRules, state: AnswerState, action: AnswerAction): AnswerState {
  switch (action.type) {
    case "select":
      if (state.phase !== "asking" || action.option !== rules.answers[state.index]) return state;
      return { ...state, solved: state.solved + 1, phase: "celebrating" };
    case "advance":
      if (state.phase !== "celebrating") return state;
      return state.index + 1 >= rules.answers.length
        ? { ...state, phase: "done" }
        : { ...state, index: state.index + 1, phase: "asking" };
  }
}
```

- [ ] **Step 5: Add the status helper**

In `apps/web/components/handActivity/handBenchFrame.ts` add, next to the existing imports, `import type { AnswerPhase } from "./answerPlay";`, and add at the end of the file:

```ts
export function answerStatusForFrame(phase: AnswerPhase, tracked: boolean): string {
  if (phase === "done") return "All done!";
  if (phase === "celebrating") return "Well done!";
  return tracked ? "Hold your hand over an answer." : "Show your hand to the camera.";
}
```

- [ ] **Step 6: Run tests to verify they pass, then typecheck, lint and commit**

Run: `npx vitest run components/handActivity` (expected: all pass, including the 8 new reducer tests and the 2 new status tests), then `npx tsc --noEmit` and `npx eslint components/handActivity` (expected: no output).

```bash
git add apps/web/components/handActivity/answerPlay.ts apps/web/components/handActivity/answerPlay.test.ts apps/web/components/handActivity/handBenchFrame.ts apps/web/components/handActivity/handBenchFrame.test.ts
git commit -m "feat: add the puzzle reducer and answer status text"
```

---

---

### Task 4: The answer scene and the Number Valley set

**Files:**
- Create: `apps/web/components/handActivity/answerSet.ts`
- Create: `apps/web/components/handActivity/answerSets/puzzleLayout.ts`
- Test: `apps/web/components/handActivity/answerSets/puzzleLayout.test.ts`
- Create: `apps/web/components/handActivity/answerSets/NumberPlate.tsx`
- Create: `apps/web/components/handActivity/answerSets/GemToken.tsx`
- Create: `apps/web/components/handActivity/answerSets/NumberValleySet.tsx`
- Create: `apps/web/components/handActivity/answerSets/index.ts`
- Test: `apps/web/components/handActivity/answerSets/answerSets.test.ts`
- Create: `apps/web/components/handActivity/AnswerBenchScene.tsx`

**Interfaces:**
- Consumes: `benchX`, `benchY`, `BENCH_WIDTH`, `BENCH_HEIGHT` (Task 1); `BenchCanvas`, `MatchBurst` (Task 1); `DwellSelector` (Task 2); `AnswerState` (Task 3) and `answerStatusForFrame` (Task 3); `trackedBenchPoint` from `handBenchFrame.ts`; `benchHit` and `BenchPoint` from `handBenchPlay.ts`; `Bench` from `sets/setParts.tsx`; `MathChallenge`, `MathRegionId`, `MathVisual`, `isCorrectMathAnswer` from `components/math/mathActivities.ts`.
- Produces:
  - `answerSet.ts`: `type PuzzleProps = { challenge: MathChallenge; answer: string | null; reducedMotion: boolean }` (`answer` is `null` while the puzzle is being asked and the correct option once it is solved); `type TokenProps = { label: string; hovered: boolean; solved: boolean; reducedMotion: boolean }`; `ANSWER_TOKEN_HOMES: readonly BenchPoint[]` (three spots along the bottom of the bench); `ANSWER_TOKEN_RADIUS = .155`; `type AnswerSet = { region: MathRegionId; label: string; visual: MathVisual["kind"]; tokens: readonly BenchPoint[]; tokenRadius: number; Scenery: ComponentType; Puzzle: ComponentType<PuzzleProps>; Token: ComponentType<TokenProps> }`.
  - `answerSets/puzzleLayout.ts`: `stoneTrail(count: number): BenchPoint[]`.
  - `answerSets/NumberPlate.tsx`: `NumberPlate(props: { text: string; size?: number; color?: string; outline?: string })`. `answerSets/GemToken.tsx`: `GemToken(props: TokenProps & { tint: string })`.
  - `answerSets/index.ts`: `type MathHandRegion = "number-valley" | "geometry-ridge" | "crystal-crater"`; `ANSWER_SETS: Partial<Record<MathHandRegion, AnswerSet>>` (only Number Valley is filled in this task).
  - `AnswerBenchScene.tsx`: `type AnswerBenchSceneProps = { set: AnswerSet; challenge: MathChallenge; state: AnswerState; latest: RefObject<HandTrackingLatest>; reducedMotion: boolean; onSelect(option: string): void; onHandStatus(message: string): void }` and `AnswerBenchScene(props)`. It calls `onSelect(option)` once when a ring fills; the caller decides whether that is right (the scene also judges it with `isCorrectMathAnswer` only to choose between a sparkle and a wobble).

Bench coordinates run 0 to 1 on both axes with y up. The three answer tokens sit on one row at `y = .2`; each puzzle draws in the upper part of the bench, `y` from about `.45` to `.95`.

- [ ] **Step 1: Create the set types**

Create `apps/web/components/handActivity/answerSet.ts`:

```ts
import type { ComponentType } from "react";
import type { MathChallenge, MathRegionId, MathVisual } from "../math/mathActivities";
import type { BenchPoint } from "./handBenchPlay";

/** What a region's puzzle draws. `answer` is null while the puzzle is asked and the correct option once it is solved. */
export type PuzzleProps = { challenge: MathChallenge; answer: string | null; reducedMotion: boolean };
/** What an answer token can react to. The scene draws the hold ring and does the wobble itself. */
export type TokenProps = { label: string; hovered: boolean; solved: boolean; reducedMotion: boolean };

/** Three spots along the bottom of the bench. Every region uses the same row so a child learns where answers are. */
export const ANSWER_TOKEN_HOMES: readonly BenchPoint[] = [{ x: .18, y: .2 }, { x: .5, y: .2 }, { x: .82, y: .2 }];
/** A hit area in bench units. Wider than the drawn gem on purpose: a hand is less exact than a mouse. */
export const ANSWER_TOKEN_RADIUS = .155;

/** One region's 3D content. The engine only ever sees option text and coordinates from this. */
export type AnswerSet = {
  region: MathRegionId;
  /** Accessible name for the 3D view, e.g. "Number Valley workbench". */
  label: string;
  /** The kind of picture this set draws; every challenge in the region must use it. */
  visual: MathVisual["kind"];
  /** One spot per option, in option order. */
  tokens: readonly BenchPoint[];
  tokenRadius: number;
  Scenery: ComponentType;
  Puzzle: ComponentType<PuzzleProps>;
  Token: ComponentType<TokenProps>;
};
```

- [ ] **Step 2: Write the failing layout test**

Create `apps/web/components/handActivity/answerSets/puzzleLayout.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { BENCH_HEIGHT, BENCH_WIDTH } from "../benchSpace";
import { stoneTrail } from "./puzzleLayout";

describe("stoneTrail", () => {
  it("gives one spot per stone, running left to right", () => {
    for (const count of [2, 3, 4]) {
      const spots = stoneTrail(count);
      expect(spots).toHaveLength(count);
      spots.slice(1).forEach((spot, index) => expect(spot.x).toBeGreaterThan(spots[index].x));
    }
  });

  it("keeps every stone on the bench, well above the answer row", () => {
    for (const spot of stoneTrail(4)) {
      expect(spot.x).toBeGreaterThanOrEqual(.1);
      expect(spot.x).toBeLessThanOrEqual(.9);
      expect(spot.y).toBeGreaterThanOrEqual(.5);
      expect(spot.y).toBeLessThanOrEqual(.9);
    }
  });

  it("curves: the middle of a four-stone trail is higher than its ends", () => {
    const spots = stoneTrail(4);
    expect(spots[1].y).toBeGreaterThan(spots[0].y);
    expect(spots[2].y).toBeGreaterThan(spots[3].y);
  });

  it("keeps neighbouring stones from touching, measured on the bench in world units", () => {
    const spots = stoneTrail(4);
    spots.slice(1).forEach((spot, index) => {
      const gap = Math.hypot((spot.x - spots[index].x) * BENCH_WIDTH, (spot.y - spots[index].y) * BENCH_HEIGHT);
      expect(gap).toBeGreaterThanOrEqual(.56);
    });
  });

  it("centres a single stone and draws nothing for none", () => {
    expect(stoneTrail(1)[0].x).toBeCloseTo(.5);
    expect(stoneTrail(0)).toEqual([]);
  });
});
```

- [ ] **Step 3: Run it to verify it fails, then write the layout helper**

Run: `npx vitest run components/handActivity/answerSets/puzzleLayout.test.ts`
Expected: FAIL (module not found).

Create `apps/web/components/handActivity/answerSets/puzzleLayout.ts`:

```ts
import type { BenchPoint } from "../handBenchPlay";

/**
 * Stepping stones for a number trail: an arch from the left of the bench to the right, in bench coordinates. Stones are
 * about .56 world units wide, so this is laid out for up to four stones; more would touch.
 */
export function stoneTrail(count: number): BenchPoint[] {
  return Array.from({ length: Math.max(0, count) }, (_, index) => {
    const t = count === 1 ? .5 : index / (count - 1);
    return { x: .14 + t * .72, y: .62 + Math.sin(t * Math.PI) * .14 };
  });
}
```

Run: `npx vitest run components/handActivity/answerSets/puzzleLayout.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 4: Write the failing set-consistency test**

Create `apps/web/components/handActivity/answerSets/answerSets.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { MATH_ACTIVITIES } from "../../math/mathActivities";
import { ANSWER_SETS } from "./index";

const sets = Object.entries(ANSWER_SETS).filter(([, set]) => set);

describe("the answer sets", () => {
  it("offers Number Valley", () => {
    expect(ANSWER_SETS["number-valley"]).toBeTruthy();
  });
});

describe.each(sets)("%s answer set", (region, set) => {
  const activity = MATH_ACTIVITIES[region as keyof typeof MATH_ACTIVITIES];

  it("is keyed by a real region and labelled", () => {
    expect(activity).toBeTruthy();
    expect(set!.region).toBe(region);
    expect(set!.label).toBe(`${activity.name} workbench`);
  });

  it("can draw every challenge the lesson has", () => {
    for (const challenge of activity.challenges) expect(challenge.visual.kind, challenge.id).toBe(set!.visual);
  });

  it("has one token spot for each option of every challenge", () => {
    for (const challenge of activity.challenges) expect(set!.tokens, challenge.id).toHaveLength(challenge.options.length);
  });

  it("keeps every token hit area on the bench and clear of every other", () => {
    for (const at of set!.tokens) {
      expect(at.x - set!.tokenRadius).toBeGreaterThanOrEqual(0);
      expect(at.x + set!.tokenRadius).toBeLessThanOrEqual(1);
      expect(at.y - set!.tokenRadius).toBeGreaterThanOrEqual(0);
      expect(at.y + set!.tokenRadius).toBeLessThanOrEqual(1);
    }
    for (let a = 0; a < set!.tokens.length; a++) {
      for (let b = a + 1; b < set!.tokens.length; b++) {
        const gap = Math.hypot(set!.tokens[a].x - set!.tokens[b].x, set!.tokens[a].y - set!.tokens[b].y);
        expect(gap, `token ${a} overlaps token ${b}`).toBeGreaterThanOrEqual(set!.tokenRadius * 2);
      }
    }
  });

  it("keeps the answer row below where the puzzle is drawn", () => {
    for (const at of set!.tokens) expect(at.y + set!.tokenRadius).toBeLessThan(.4);
  });
});
```

Run: `npx vitest run components/handActivity/answerSets/answerSets.test.ts`
Expected: FAIL (module `./index` not found).

- [ ] **Step 5: Create the number plate and the gem token**

Numbers are drawn onto a canvas texture, so no font has to be downloaded. Create `apps/web/components/handActivity/answerSets/NumberPlate.tsx`:

```tsx
"use client";

import { useEffect, useMemo } from "react";
import { CanvasTexture, SRGBColorSpace } from "three";

const TEXTURE_SIZE = 128;

/** Draws `text` centred on a square canvas, bold with a dark outline so it reads on any stone or gem. */
function drawText(canvas: HTMLCanvasElement, text: string, color: string, outline: string): boolean {
  const context = canvas.getContext("2d");
  if (!context) return false;
  context.clearRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE);
  context.font = `800 ${text.length > 1 ? 84 : 104}px "Trebuchet MS", "Segoe UI", sans-serif`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.lineJoin = "round";
  context.lineWidth = 14;
  context.strokeStyle = outline;
  context.strokeText(text, TEXTURE_SIZE / 2, TEXTURE_SIZE / 2 + 6);
  context.fillStyle = color;
  context.fillText(text, TEXTURE_SIZE / 2, TEXTURE_SIZE / 2 + 6);
  return true;
}

/** A number (or "?", "+", "−") on a square plane facing the camera. */
export function NumberPlate({ text, size = .3, color = "#ffffff", outline = "#173e55" }: { text: string; size?: number; color?: string; outline?: string }) {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = TEXTURE_SIZE;
    canvas.height = TEXTURE_SIZE;
    if (!drawText(canvas, text, color, outline)) return null;
    const made = new CanvasTexture(canvas);
    made.colorSpace = SRGBColorSpace;
    return made;
  }, [text, color, outline]);
  useEffect(() => () => texture?.dispose(), [texture]);
  if (!texture) return null;
  return <mesh>
    <planeGeometry args={[size, size]} />
    <meshBasicMaterial map={texture} transparent toneMapped={false} depthWrite={false} />
  </mesh>;
}
```

Create `apps/web/components/handActivity/answerSets/GemToken.tsx`:

```tsx
"use client";

import type { TokenProps } from "../answerSet";
import { NumberPlate } from "./NumberPlate";

/** An answer: a number on a cut gem. It glows when the hand is over it and turns green when it is the right answer. */
export function GemToken({ label, hovered, solved, tint }: TokenProps & { tint: string }) {
  const body = solved ? "#7be3a2" : tint;
  return <group scale={solved ? 1.12 : hovered ? 1.14 : 1}>
    <mesh scale={[1.25, 1.1, .5]}>
      <octahedronGeometry args={[.24]} />
      <meshStandardMaterial color={body} emissive={body} emissiveIntensity={hovered || solved ? .55 : .2} roughness={.35} metalness={.1} flatShading />
    </mesh>
    <group position={[0, 0, .14]}>
      <NumberPlate text={label} size={.36} />
    </group>
  </group>;
}
```

- [ ] **Step 6: Create the Number Valley set and the registry**

Create `apps/web/components/handActivity/answerSets/NumberValleySet.tsx`:

```tsx
"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group, Mesh } from "three";
import { ANSWER_TOKEN_HOMES, ANSWER_TOKEN_RADIUS, type AnswerSet, type PuzzleProps, type TokenProps } from "../answerSet";
import { benchX, benchY } from "../benchSpace";
import { Bench } from "../sets/setParts";
import { GemToken } from "./GemToken";
import { NumberPlate } from "./NumberPlate";
import { stoneTrail } from "./puzzleLayout";

function Scenery() {
  return <group>
    <Bench color="#2e6b62" />
    <mesh position={[-.75, -.28, -.02]} scale={[1.6, .5, 1]}><circleGeometry args={[.7, 40]} /><meshStandardMaterial color="#3f8a6f" /></mesh>
    <mesh position={[.7, -.32, -.02]} scale={[1.8, .45, 1]}><circleGeometry args={[.7, 40]} /><meshStandardMaterial color="#357a63" /></mesh>
    <mesh position={[0, .3, -.03]} scale={[2.55, .42, 1]}><circleGeometry args={[.7, 48]} /><meshStandardMaterial color="#79b58f" transparent opacity={.55} /></mesh>
  </group>;
}

function Stone({ x, y, gap, filled, text, reducedMotion }: { x: number; y: number; gap: boolean; filled: boolean; text: string; reducedMotion: boolean }) {
  const body = useRef<Group>(null);
  const glow = useRef<Mesh>(null);
  const age = useRef(0);
  useFrame(({ clock }, rawDelta) => {
    if (glow.current) glow.current.scale.setScalar(gap && !filled && !reducedMotion ? 1 + Math.sin(clock.elapsedTime * 3.2) * .08 : 1);
    age.current = filled ? age.current + Math.min(rawDelta, .05) : 0;
    // The number drops onto its stone with a small pop.
    body.current?.scale.setScalar(1 + (filled && !reducedMotion ? Math.max(0, 1 - age.current / .35) * .5 : 0));
  });
  const stone = gap ? (filled ? "#8fe0a8" : "#2d4b5a") : "#cbb98f";
  return <group position={[x, y, .1]}>
    <group ref={body}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[.25, .28, .12, 28]} />
        <meshStandardMaterial color={stone} roughness={.85} />
      </mesh>
      {gap ? <mesh ref={glow} position={[0, 0, .07]}>
        <torusGeometry args={[.28, .025, 10, 40]} />
        <meshBasicMaterial color={filled ? "#9dffb8" : "#ffe17d"} />
      </mesh> : null}
      <group position={[0, 0, .08]}>
        <NumberPlate text={text} size={.4} color={gap && !filled ? "#ffe17d" : "#ffffff"} />
      </group>
    </group>
  </group>;
}

/** A curving trail of stepping stones. The empty glowing stone takes the answer once it is chosen. */
function Puzzle({ challenge, answer, reducedMotion }: PuzzleProps) {
  const visual = challenge.visual;
  if (visual.kind !== "sequence") return null;
  const spots = stoneTrail(visual.values.length);
  return <group>
    {visual.values.map((value, index) => {
      const gap = value === null;
      return <Stone
        key={index}
        x={benchX(spots[index].x)}
        y={benchY(spots[index].y)}
        gap={gap}
        filled={gap && answer !== null}
        text={gap ? (answer ?? "?") : String(value)}
        reducedMotion={reducedMotion}
      />;
    })}
  </group>;
}

function Token(props: TokenProps) {
  return <GemToken {...props} tint="#7fb6ff" />;
}

export const NUMBER_VALLEY_SET: AnswerSet = {
  region: "number-valley",
  label: "Number Valley workbench",
  visual: "sequence",
  tokens: ANSWER_TOKEN_HOMES,
  tokenRadius: ANSWER_TOKEN_RADIUS,
  Scenery,
  Puzzle,
  Token,
};
```

Create `apps/web/components/handActivity/answerSets/index.ts`:

```ts
import type { AnswerSet } from "../answerSet";
import { NUMBER_VALLEY_SET } from "./NumberValleySet";

/** The three Numeria regions that are played with the hand. Fraction Forest has its own mission. */
export type MathHandRegion = "number-valley" | "geometry-ridge" | "crystal-crater";

/** Each hand-played region's 3D set, keyed by region id. */
export const ANSWER_SETS: Partial<Record<MathHandRegion, AnswerSet>> = {
  "number-valley": NUMBER_VALLEY_SET,
};
```

Run: `npx vitest run components/handActivity/answerSets`
Expected: PASS (`puzzleLayout` 5 tests and `answerSets` 6 tests: 1 registry test plus 5 for Number Valley).

- [ ] **Step 7: Create the answer scene**

Create `apps/web/components/handActivity/AnswerBenchScene.tsx`. The scene is the only place that reads the hand each frame: it finds the token under the hand, runs the dwell selector, fills the ring, and reports a finished choice. It does not decide what a right answer does; it only shows a sparkle for a right one and a wobble for a wrong one.

```tsx
"use client";

import { useRef, useState, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";
import type { HandTrackingLatest } from "../../features/gestures/useHandTracking";
import { isCorrectMathAnswer, type MathChallenge } from "../math/mathActivities";
import type { AnswerState } from "./answerPlay";
import type { AnswerSet } from "./answerSet";
import { BenchCanvas } from "./BenchCanvas";
import { BENCH_WIDTH, benchX, benchY } from "./benchSpace";
import { DwellSelector } from "./dwellSelect";
import { answerStatusForFrame, trackedBenchPoint } from "./handBenchFrame";
import { benchHit } from "./handBenchPlay";
import { MatchBurst } from "./MatchBurst";

export type AnswerBenchSceneProps = {
  set: AnswerSet;
  challenge: MathChallenge;
  state: AnswerState;
  latest: RefObject<HandTrackingLatest>;
  reducedMotion: boolean;
  onSelect(option: string): void;
  onHandStatus(message: string): void;
};

const TOKEN_Z = .3;
const CURSOR_Z = .75;
const RING_DOTS = 32;
const RING_RADIUS = .27;
const SLIDE_FROM = 1.6;

function AnswerInteraction({ set, challenge, state, latest, reducedMotion, onSelect, onHandStatus }: AnswerBenchSceneProps) {
  const selector = useRef(new DwellSelector());
  const tokenGroups = useRef(new Map<string, Group>());
  const ringGroups = useRef(new Map<string, Group>());
  const stage = useRef<Group>(null);
  const cursor = useRef<Group>(null);
  const current = useRef({ challenge, state, onSelect, onHandStatus });
  current.current = { challenge, state, onSelect, onHandStatus };
  const hoverRef = useRef<string | null>(null);
  const statusRef = useRef("");
  const shakeUntil = useRef(new Map<string, number>());
  const shownChallenge = useRef(challenge.id);
  const burstKey = useRef(0);
  const [hovered, setHovered] = useState<string | null>(null);
  const [bursts, setBursts] = useState<{ key: number; x: number; y: number }[]>([]);
  const { Scenery, Puzzle, Token } = set;

  useFrame(({ clock }, rawDelta) => {
    const delta = Math.min(rawDelta, .05);
    const now = clock.elapsedTime;
    const { challenge: c, state: s, onSelect: choose, onHandStatus: report } = current.current;
    const point = trackedBenchPoint(latest.current);
    const asking = s.phase === "asking";

    const zones = c.options.map((option, index) => ({ id: option, at: set.tokens[index], radius: set.tokenRadius }));
    const over = point && asking ? benchHit(point, zones) : null;
    const result = selector.current.update({ over, isTracking: point !== null, enabled: asking, at: now * 1000 });

    if (over !== hoverRef.current) { hoverRef.current = over; setHovered(over); }

    if (result.selected) {
      const index = c.options.indexOf(result.selected);
      if (isCorrectMathAnswer(c, result.selected)) {
        if (!reducedMotion && index >= 0) {
          burstKey.current += 1;
          const key = burstKey.current;
          setBursts((previous) => [...previous, { key, x: benchX(set.tokens[index].x), y: benchY(set.tokens[index].y) }]);
        }
      } else {
        shakeUntil.current.set(result.selected, now + .5);
      }
      choose(result.selected);
    }

    ringGroups.current.forEach((group, option) => {
      const fill = result.id === option ? result.progress : 0;
      group.children.forEach((dot, index) => { dot.visible = (index + 1) / RING_DOTS <= fill + 1e-6; });
    });

    const ease = 1 - Math.exp(-(reducedMotion ? 60 : 9) * delta);
    tokenGroups.current.forEach((group, option) => {
      const shake = shakeUntil.current.get(option) ?? 0;
      group.rotation.z = !reducedMotion && shake > now ? Math.sin(now * 42) * .18 * Math.min(1, shake - now) : 0;
    });
    if (stage.current) {
      if (shownChallenge.current !== c.id) {
        shownChallenge.current = c.id;
        if (!reducedMotion) stage.current.position.x = SLIDE_FROM;
      }
      stage.current.position.x += (0 - stage.current.position.x) * ease;
    }

    if (cursor.current) {
      cursor.current.visible = point !== null;
      if (point) cursor.current.position.set(benchX(point.x), benchY(point.y), CURSOR_Z);
    }

    const message = answerStatusForFrame(s.phase, point !== null);
    if (message !== statusRef.current) { statusRef.current = message; report(message); }
  });

  const solved = state.phase !== "asking";
  return <>
    <Scenery />
    <mesh position={[0, benchY(set.tokens[0].y), .02]}>
      <boxGeometry args={[BENCH_WIDTH * .98, .62, .04]} />
      <meshStandardMaterial color="#173e55" transparent opacity={.55} />
    </mesh>
    <group ref={stage}>
      <Puzzle challenge={challenge} answer={solved ? challenge.answer : null} reducedMotion={reducedMotion} />
    </group>
    {challenge.options.map((option, index) => <group key={`${challenge.id}:${option}`} position={[benchX(set.tokens[index].x), benchY(set.tokens[index].y), TOKEN_Z]}>
      <group ref={(node) => { if (node) tokenGroups.current.set(option, node); else tokenGroups.current.delete(option); }}>
        <Token label={option} hovered={hovered === option} solved={solved && option === challenge.answer} reducedMotion={reducedMotion} />
      </group>
      <mesh><torusGeometry args={[RING_RADIUS, .008, 8, 48]} /><meshBasicMaterial color="#ffffff" transparent opacity={.35} /></mesh>
      <group ref={(node) => { if (node) ringGroups.current.set(option, node); else ringGroups.current.delete(option); }}>
        {Array.from({ length: RING_DOTS }, (_, dot) => {
          const angle = Math.PI / 2 - (dot / RING_DOTS) * Math.PI * 2;
          return <mesh key={dot} visible={false} position={[Math.cos(angle) * RING_RADIUS, Math.sin(angle) * RING_RADIUS, .05]}>
            <circleGeometry args={[.028, 10]} />
            <meshBasicMaterial color="#ffe17d" />
          </mesh>;
        })}
      </group>
    </group>)}
    {bursts.map((burst) => <MatchBurst key={burst.key} x={burst.x} y={burst.y} onDone={() => setBursts((previous) => previous.filter((b) => b.key !== burst.key))} />)}
    <group ref={cursor} visible={false}>
      <mesh><torusGeometry args={[.1, .016, 12, 40]} /><meshBasicMaterial color="#ffe17d" /></mesh>
    </group>
  </>;
}

/** The answer bench: the puzzle, three answer gems with hold rings, and a cursor that follows the hand. */
export function AnswerBenchScene(props: AnswerBenchSceneProps) {
  return <BenchCanvas
    label={props.set.label}
    reducedMotion={props.reducedMotion}
    failureMessage="The workbench needs a graphics-capable device."
    onFailure={props.onHandStatus}
  >
    <AnswerInteraction {...props} />
  </BenchCanvas>;
}
```

The scene has no unit test of its own, as with `HandBenchScene`: react-three-fiber cannot render in jsdom. Its logic is in the tested `DwellSelector`, `answerReducer` and `benchHit`, and it is checked in the browser in Task 5.

- [ ] **Step 8: Typecheck, lint, run the whole handActivity folder and commit**

Run: `npx tsc --noEmit` and `npx eslint components/handActivity` (expected: no output), then `npx vitest run components/handActivity` (expected: every file passes, Round 1 tests included).

```bash
git add apps/web/components/handActivity/answerSet.ts apps/web/components/handActivity/answerSets apps/web/components/handActivity/AnswerBenchScene.tsx
git commit -m "feat: add the answer bench scene and the Number Valley set"
```

---

### Task 5: The hand session, and Number Valley in Numeria

**Files:**
- Create: `apps/web/components/math/MathHandSession.tsx`
- Test: `apps/web/components/math/MathHandSession.test.tsx`
- Modify: `apps/web/components/handActivity/answerSets/index.ts` (add `answerSetFor`)
- Modify: `apps/web/components/handActivity/answerSets/answerSets.test.ts` (test it)
- Modify: `apps/web/components/math/mathPlanet.module.css` (add `.handOverlay`)
- Modify: `apps/web/components/math/MathPlanetCanvas.tsx`
- Modify: `apps/web/components/math/MathPlanetCanvas.test.tsx`
- Modify: `apps/web/tests/browser/activity-session-focus.spec.ts` (points at Geometry Ridge, which still has the old quiz until Task 7)

**Interfaces:**
- Consumes: `answerReducer`, `initialAnswerState`, `AnswerAction`, `AnswerRules`, `AnswerState` (Task 3); `AnswerBenchScene` and `AnswerBenchSceneProps` (Task 4); `ANSWER_SETS`, `MathHandRegion` (Task 4); `HandActivityShell` (Round 1: `label`, `title`, `instruction`, `progress`, `step`, `coach`, `exitLabel`, `onExit`, `manageFocus`, and a render-prop child that receives `{ latest, ready, reducedMotion, onHandStatus }`); `useWiggleSound()` (`play(name)`, `unlock()`; the sounds used are `"correct"`, `"tryAgain"`, `"celebrate"`); `mathActivity(id)` and `MATH_ACTIVITIES`.
- Produces: `CELEBRATE_MS = 1500`; `MathHandSession(props: { region: MathHandRegion; onComplete(region: MathRegionId): void; onClose(): void })`; `answerSetFor(region: string): AnswerSet | undefined` from `answerSets/index.ts`.
- Behaviour: the coach line at the start of each puzzle is the challenge prompt (so it is spoken and announced); a wrong answer says `Try again. <hint>`; a right one says `That's right! Great thinking.`, fills a progress dot and, `CELEBRATE_MS` later, moves on; after the last puzzle the coach says `Wonderful exploring! You solved every puzzle.` and `onComplete(region)` is called once. Leaving mid-region and coming back restarts it (progress is not saved).

- [ ] **Step 1: Write the failing session test**

Create `apps/web/components/math/MathHandSession.test.tsx`:

```tsx
// @vitest-environment jsdom
import React, { useState } from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { AnswerBenchSceneProps } from "../handActivity/AnswerBenchScene";
import { ANSWER_SETS, type MathHandRegion } from "../handActivity/answerSets";
import { MATH_ACTIVITIES, type MathChallenge } from "./mathActivities";
import { CELEBRATE_MS, MathHandSession } from "./MathHandSession";

const mock = vi.hoisted(() => ({ scene: null as AnswerBenchSceneProps | null, play: vi.fn(), unlocks: [] as ReturnType<typeof vi.fn>[], speak: vi.fn() }));
vi.mock("../../features/gestures/useHandTracking", () => ({
  useHandTracking: () => ({ status: "ready", video: { current: null }, retry: vi.fn(), latest: { current: { isTracking: false } } }),
}));
vi.mock("../handActivity/AnswerBenchScene", () => ({
  AnswerBenchScene: (props: AnswerBenchSceneProps) => { mock.scene = props; return <div data-testid="scene" />; },
}));
vi.mock("../../features/voice/voicePreference", () => ({ speakIfUnmuted: (text: string) => mock.speak(text) }));
// Every component that calls the hook gets its own instance with its own unlock, like the real hook.
vi.mock("../../features/audio/useWiggleSound", () => ({
  useWiggleSound: () => {
    const [unlock] = useState(() => { const fn = vi.fn(); mock.unlocks.push(fn); return fn; });
    return { play: mock.play, unlock, muted: false, setMuted: vi.fn() };
  },
}));

beforeEach(() => { mock.scene = null; mock.unlocks.length = 0; vi.clearAllMocks(); vi.useFakeTimers(); });
afterEach(() => { cleanup(); vi.useRealTimers(); });

const regions = (Object.keys(ANSWER_SETS) as MathHandRegion[]).filter((region) => ANSWER_SETS[region]);
const select = (option: string) => act(() => mock.scene!.onSelect(option));
const celebrate = () => act(() => { vi.advanceTimersByTime(CELEBRATE_MS + 50); });
const status = () => screen.getByRole("status").textContent ?? "";
const progress = () => screen.getByRole("img", { name: /puzzles solved/ }).getAttribute("aria-label");
const wrongFor = (challenge: MathChallenge) => challenge.options.find((option) => option !== challenge.answer)!;

function open(region: MathHandRegion = "number-valley", handlers: { onComplete?: () => void; onClose?: () => void } = {}) {
  const onComplete = handlers.onComplete ?? vi.fn();
  const onClose = handlers.onClose ?? vi.fn();
  render(<MathHandSession region={region} onComplete={onComplete} onClose={onClose} />);
  return { onComplete, onClose };
}

it.each(regions)("%s: plays every puzzle with hand selections only, and completes once", (region) => {
  const activity = MATH_ACTIVITIES[region];
  const total = activity.challenges.length;
  const { onComplete } = open(region);
  expect(screen.queryByRole("radio")).toBeNull();
  expect(screen.queryByRole("button", { name: "Check answer" })).toBeNull();

  activity.challenges.forEach((challenge, index) => {
    expect(screen.getByText(`Puzzle ${index + 1} of ${total}`)).toBeTruthy();
    expect(status()).toBe(challenge.prompt);
    expect(mock.scene?.challenge.id).toBe(challenge.id);

    select(wrongFor(challenge));
    expect(status()).toBe(`Try again. ${challenge.hint}`);
    expect(mock.play).toHaveBeenLastCalledWith("tryAgain");
    expect(progress()).toBe(`${index} of ${total} puzzles solved`);

    select(challenge.answer);
    expect(status()).toBe("That's right! Great thinking.");
    expect(mock.play).toHaveBeenLastCalledWith("correct");
    expect(progress()).toBe(`${index + 1} of ${total} puzzles solved`);
    celebrate();
    expect(onComplete).toHaveBeenCalledTimes(index === total - 1 ? 1 : 0);
  });

  expect(status()).toBe("Wonderful exploring! You solved every puzzle.");
  expect(mock.play).toHaveBeenLastCalledWith("celebrate");
  expect(screen.getByText("All done!", { selector: "p" })).toBeTruthy();
  expect(onComplete).toHaveBeenCalledWith(region);
});

it("waits out the celebration before showing the next puzzle", () => {
  open();
  const [first, second] = MATH_ACTIVITIES["number-valley"].challenges;
  select(first.answer);
  act(() => { vi.advanceTimersByTime(CELEBRATE_MS - 100); });
  expect(screen.getByText("Puzzle 1 of 3")).toBeTruthy();
  expect(mock.scene?.state.phase).toBe("celebrating");
  act(() => { vi.advanceTimersByTime(200); });
  expect(screen.getByText("Puzzle 2 of 3")).toBeTruthy();
  expect(mock.scene?.challenge.id).toBe(second.id);
  expect(mock.scene?.state.phase).toBe("asking");
});

it("ignores selections while a right answer is being celebrated", () => {
  open();
  const first = MATH_ACTIVITIES["number-valley"].challenges[0];
  select(first.answer);
  select(wrongFor(first));
  select(first.answer);
  expect(mock.play).not.toHaveBeenCalledWith("tryAgain");
  expect(progress()).toBe("1 of 3 puzzles solved");
});

it("counts a right answer once when two arrive in one tick", () => {
  open();
  const first = MATH_ACTIVITIES["number-valley"].challenges[0];
  act(() => { mock.scene!.onSelect(first.answer); mock.scene!.onSelect(first.answer); });
  expect(progress()).toBe("1 of 3 puzzles solved");
  expect(mock.play.mock.calls.filter(([name]) => name === "correct")).toHaveLength(1);
});

it("does not complete the region until the last puzzle has been celebrated", () => {
  const { onComplete } = open();
  const challenges = MATH_ACTIVITIES["number-valley"].challenges;
  for (const challenge of challenges.slice(0, -1)) { select(challenge.answer); celebrate(); }
  select(challenges[challenges.length - 1].answer);
  expect(onComplete).not.toHaveBeenCalled();
  celebrate();
  expect(onComplete).toHaveBeenCalledTimes(1);
  celebrate();
  expect(onComplete).toHaveBeenCalledTimes(1);
});

it("gives the scene this region's set", () => {
  open();
  expect(mock.scene?.set).toBe(ANSWER_SETS["number-valley"]);
});

it("leaves through the exit button", () => {
  const { onClose } = open();
  fireEvent.click(screen.getByRole("button", { name: "Back to Numeria" }));
  expect(onClose).toHaveBeenCalledTimes(1);
});

it("unlocks its own sound instance on mount, not only the shell's", () => {
  open();
  expect(mock.unlocks.length).toBeGreaterThanOrEqual(2);
  for (const unlock of mock.unlocks) expect(unlock).toHaveBeenCalled();
});

it("starts again from the first puzzle when it is opened again", () => {
  open();
  select(MATH_ACTIVITIES["number-valley"].challenges[0].answer);
  celebrate();
  expect(screen.getByText("Puzzle 2 of 3")).toBeTruthy();
  cleanup();
  open();
  expect(screen.getByText("Puzzle 1 of 3")).toBeTruthy();
  expect(progress()).toBe("0 of 3 puzzles solved");
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run components/math/MathHandSession.test.tsx`
Expected: FAIL (cannot find `./MathHandSession`).

- [ ] **Step 3: Add `answerSetFor` with a test**

In `apps/web/components/handActivity/answerSets/index.ts`, add at the end:

```ts

/** The hand-played set for a region id, or undefined for a region that is not (yet) hand-played. */
export function answerSetFor(region: string): AnswerSet | undefined {
  return Object.prototype.hasOwnProperty.call(ANSWER_SETS, region) ? ANSWER_SETS[region as MathHandRegion] : undefined;
}
```

In `apps/web/components/handActivity/answerSets/answerSets.test.ts`, change the import to `import { ANSWER_SETS, answerSetFor } from "./index";` and add inside the first `describe("the answer sets", ...)` block:

```ts
  it("looks a set up by region id, and only for hand-played regions", () => {
    expect(answerSetFor("number-valley")).toBe(ANSWER_SETS["number-valley"]);
    expect(answerSetFor("fraction-forest")).toBeUndefined();
    expect(answerSetFor("toString")).toBeUndefined();
  });
```

- [ ] **Step 4: Write the session**

Create `apps/web/components/math/MathHandSession.tsx`:

```tsx
"use client";

import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import { useWiggleSound } from "../../features/audio/useWiggleSound";
import { answerReducer, initialAnswerState, type AnswerAction, type AnswerRules, type AnswerState } from "../handActivity/answerPlay";
import { AnswerBenchScene } from "../handActivity/AnswerBenchScene";
import { ANSWER_SETS, type MathHandRegion } from "../handActivity/answerSets";
import { HandActivityShell } from "../handActivity/HandActivityShell";
import { mathActivity, type MathRegionId } from "./mathActivities";

/** How long a right answer is celebrated before the next puzzle slides in. */
export const CELEBRATE_MS = 1500;
const RIGHT_LINE = "That's right! Great thinking.";
const DONE_LINE = "Wonderful exploring! You solved every puzzle.";

export type MathHandSessionProps = {
  region: MathHandRegion;
  onComplete(region: MathRegionId): void;
  onClose(): void;
};

/** A camera-first hand session for one Numeria region. The caller only opens it for regions that have an answer set. */
export function MathHandSession({ region, onComplete, onClose }: MathHandSessionProps) {
  const activity = mathActivity(region)!;
  const set = ANSWER_SETS[region]!;
  const rules = useMemo<AnswerRules>(() => ({ answers: activity.challenges.map((challenge) => challenge.answer) }), [activity]);
  const sound = useWiggleSound();
  const unlock = useRef(sound.unlock);
  unlock.current = sound.unlock;
  const play = useRef(sound.play);
  play.current = sound.play;
  const complete = useRef(onComplete);
  complete.current = onComplete;
  const notified = useRef(false);
  const [state, dispatch] = useReducer(
    (current: AnswerState, action: AnswerAction) => answerReducer(rules, current, action),
    initialAnswerState,
  );
  const stateRef = useRef(state);
  stateRef.current = state;
  const [line, setLine] = useState(activity.challenges[0].prompt);

  // This session plays its own sounds, so unlock this instance for strict-autoplay browsers.
  useEffect(() => { unlock.current(); }, []);

  const handleSelect = (option: string) => {
    const before = stateRef.current;
    const after = answerReducer(rules, before, { type: "select", option });
    if (after === before) {
      // A wrong answer leaves the state untouched; anything else that is ignored (celebrating, done) says nothing.
      if (before.phase === "asking") {
        play.current("tryAgain");
        setLine(`Try again. ${activity.challenges[before.index].hint}`);
      }
      return;
    }
    dispatch({ type: "select", option });
    stateRef.current = after; // keep the ref authoritative until the next render, so same-tick selections see fresh state
    play.current("correct");
    setLine(RIGHT_LINE);
  };

  useEffect(() => {
    if (state.phase !== "celebrating") return;
    const timer = window.setTimeout(() => {
      const next = answerReducer(rules, stateRef.current, { type: "advance" });
      stateRef.current = next;
      dispatch({ type: "advance" });
      if (next.phase === "done") {
        play.current("celebrate");
        setLine(DONE_LINE);
        if (!notified.current) { notified.current = true; complete.current(region); }
      } else {
        setLine(activity.challenges[next.index].prompt);
      }
    }, CELEBRATE_MS);
    return () => window.clearTimeout(timer);
  }, [state.phase, state.index, rules, activity, region]);

  const total = activity.challenges.length;
  const challenge = activity.challenges[state.index];
  const done = state.phase === "done";
  return <HandActivityShell
    label={`${activity.name} activity`}
    title={activity.name}
    instruction={done ? "Wonderful exploring!" : challenge.prompt}
    progress={{ count: state.solved, total, label: "puzzles solved" }}
    step={done ? "All done!" : `Puzzle ${state.index + 1} of ${total}`}
    coach={line}
    exitLabel="Back to Numeria"
    onExit={onClose}
    manageFocus={false}
  >
    {(scene) => <AnswerBenchScene
      set={set}
      challenge={challenge}
      state={state}
      latest={scene.latest}
      reducedMotion={scene.reducedMotion}
      onSelect={handleSelect}
      onHandStatus={scene.onHandStatus}
    />}
  </HandActivityShell>;
}
```

- [ ] **Step 5: Run the tests**

Run: `npx vitest run components/math/MathHandSession.test.tsx components/handActivity/answerSets`
Expected: PASS (10 session tests: one per hand region, currently Number Valley, plus 9 more; the set file now has 7).

- [ ] **Step 6: Add the dark overlay and open the hand session for Number Valley**

The hand session has its own exit button and camera frame, so it does not use the old light overlay or its "Close activity" toolbar. Append to `apps/web/components/math/mathPlanet.module.css`, directly after the `.sessionToolbar` rule:

```css
.handOverlay { position: fixed; inset: 0; z-index: 20; overflow-y: auto; padding: 16px; background: #172d52e8; }
```

In `apps/web/components/math/MathPlanetCanvas.tsx`:

1. Add the imports next to the existing `MathActivitySession` import: `import { MathHandSession } from "./MathHandSession";` and `import { answerSetFor, type MathHandRegion } from "../handActivity/answerSets";`.
2. Just above the `return <ActivitySessionFrame ...` line add: `const handSession = session !== null && answerSetFor(session) !== undefined;`
3. Replace the block that renders the session overlay (currently `{session ? <div className={styles.sessionOverlay} data-session-controls> ... </div> : null}`) with:

```tsx
    {session && handSession ? <div className={styles.handOverlay} data-session-controls>
      <MathHandSession key={session} region={session as MathHandRegion} onComplete={completeRegion} onClose={closeSession} />
    </div> : null}
    {session && !handSession ? <div className={styles.sessionOverlay} data-session-controls>
      <div className={styles.sessionToolbar}>
        <button type="button" className={styles.backButton} onClick={closeSession}>Close activity</button>
      </div>
      <MathActivitySession key={session} region={session} onComplete={completeRegion} onClose={closeSession} />
    </div> : null}
```

- [ ] **Step 7: Update the Numeria canvas tests**

`MathPlanetCanvas.test.tsx` opens Number Valley in several tests, and it now opens the hand session. From `apps/web` run:

```bash
python - <<'EOF'
p = "components/math/MathPlanetCanvas.test.tsx"
s = open(p, encoding="utf-8").read()

# 1. Mock the camera, the 3D scene and sound so a hand session can open under jsdom.
s = s.replace('import type { UniverseCanvasProps } from "../universe/UniverseCanvas";\n',
              'import type { AnswerBenchSceneProps } from "../handActivity/AnswerBenchScene";\nimport type { UniverseCanvasProps } from "../universe/UniverseCanvas";\n', 1)
s = s.replace('import { MathPlanetCanvas } from "./MathPlanetCanvas";\n',
              'import { CELEBRATE_MS } from "./MathHandSession";\nimport { MathPlanetCanvas } from "./MathPlanetCanvas";\n', 1)
old = 'const state = vi.hoisted(() => ({ props: {} as UniverseCanvasProps }));\n'
new = ('const state = vi.hoisted(() => ({ props: {} as UniverseCanvasProps }));\n'
       'const answers = vi.hoisted(() => ({ props: null as AnswerBenchSceneProps | null }));\n'
       'vi.mock("../../features/gestures/useHandTracking", () => ({\n'
       '  useHandTracking: () => ({ status: "ready", video: { current: null }, retry: vi.fn(), latest: { current: { isTracking: false } } }),\n'
       '}));\n'
       'vi.mock("../handActivity/AnswerBenchScene", () => ({\n'
       '  AnswerBenchScene: (props: AnswerBenchSceneProps) => { answers.props = props; return <div data-testid="answer-scene" />; },\n'
       '}));\n'
       'vi.mock("../../features/audio/useWiggleSound", () => ({ useWiggleSound: () => ({ play: vi.fn(), unlock: vi.fn(), muted: false, setMuted: vi.fn() }) }));\n'
       'vi.mock("../../features/voice/voicePreference", () => ({ speakIfUnmuted: vi.fn(), isVoiceMuted: () => true, setVoiceMuted: vi.fn() }));\n')
assert old in s
s = s.replace(old, new, 1)

# 2. Number Valley is hand-played now; the other regions still use the field quiz until Task 7.
old = 'const fieldRegions = regions.filter((landmark) => landmark.id !== "fraction-forest");'
new = 'const fieldRegions = regions.filter((landmark) => landmark.id !== "fraction-forest" && landmark.id !== "number-valley");'
assert old in s
s = s.replace(old, new, 1)

# 3. The two tests that walk through the old quiz now do it in Geometry Ridge.
start = s.index('it("offers an explicit close button before completing an activity"')
end = s.index('it("toggles, resets, and accepts scene camera and destination changes"')
segment = s[start:end].replace("Number Valley", "Geometry Ridge").replace('"number-valley"', '"geometry-ridge"')
s = s[:start] + segment + s[end:]

# 4. New tests for the hand-played Number Valley.
marker = 'it("toggles, resets, and accepts scene camera and destination changes"'
addition = '''it("opens Number Valley as a camera-first hand session with no radio buttons", () => {
  render(<MathPlanetCanvas onBackToWorlds={vi.fn()} />);
  visit("Number Valley");
  fireEvent.click(screen.getByRole("button", { name: "Explore Number Valley" }));
  const dialog = screen.getByRole("dialog", { name: "Number Valley activity session" });
  expect(within(dialog).getByRole("heading", { name: "Number Valley" })).toBeTruthy();
  expect(within(dialog).getByText("Puzzle 1 of 3")).toBeTruthy();
  expect(within(dialog).queryByRole("radio")).toBeNull();
  expect(within(dialog).queryByRole("button", { name: "Close activity" })).toBeNull();
  expect(within(dialog).getByRole("button", { name: "Back to Numeria" })).toBeTruthy();
  expect(answers.props?.challenge.id).toBe(MATH_ACTIVITIES["number-valley"].challenges[0].id);
});

it("marks Number Valley complete and announces it after the hand session finishes", () => {
  vi.useFakeTimers();
  try {
    const onSessionOpenChange = vi.fn();
    render(<MathPlanetCanvas onBackToWorlds={vi.fn()} onSessionOpenChange={onSessionOpenChange} />);
    visit("Number Valley");
    fireEvent.click(screen.getByRole("button", { name: "Explore Number Valley" }));
    for (const challenge of MATH_ACTIVITIES["number-valley"].challenges) {
      act(() => answers.props!.onSelect(challenge.answer));
      act(() => { vi.advanceTimersByTime(CELEBRATE_MS + 50); });
    }
    fireEvent.click(screen.getByRole("button", { name: "Back to Numeria" }));
    expect(onSessionOpenChange.mock.calls).toEqual([[true], [false]]);
    expect(screen.getByText("Wonderful exploring! Number Valley complete.").getAttribute("aria-live")).toBe("polite");
    expect(screen.getByText("1 of 4 regions complete")).toBeTruthy();
  } finally {
    vi.useRealTimers();
  }
});

'''
assert marker in s
s = s.replace(marker, addition + marker, 1)
open(p, "w", encoding="utf-8").write(s)
EOF
```

The existing test "keeps the universe mounted and inert, pauses input, and restores focus on Escape" keeps using Number Valley and must still pass: Escape, focus return and the paused input are handled by `ActivitySessionFrame`, not by the session.

Then point the radio-button browser spec at Geometry Ridge (it is replaced in Task 7):

```bash
python - <<'EOF'
p = "tests/browser/activity-session-focus.spec.ts"
s = open(p, encoding="utf-8").read()
s = s.replace('MATH_ACTIVITIES["number-valley"]', 'MATH_ACTIVITIES["geometry-ridge"]').replace("Number Valley", "Geometry Ridge")
s = s.replace("the other regions", "Geometry Ridge and Crystal Crater")
open(p, "w", encoding="utf-8").write(s)
EOF
```

- [ ] **Step 8: Run the unit suites, typecheck and lint**

Run: `npx vitest run components/math components/handActivity` (expected: every file passes, including all of `MathPlanetCanvas.test.tsx`), then `npx tsc --noEmit` and `npx eslint components/math components/handActivity tests` (expected: no output).

- [ ] **Step 9: Commit**

```bash
git add apps/web/components/math apps/web/components/handActivity/answerSets apps/web/tests/browser/activity-session-focus.spec.ts
git commit -m "feat: play Number Valley with the hand in the camera-first frame"
```

- [ ] **Step 10: Look at Number Valley in a real browser (controller, not the implementer)**

Rebuild from the repo root: `NODE_OPTIONS=--max-old-space-size=2048 npm run build --workspace=@wiggle/web`. Start the app from `apps/web` with `node node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 3300` (in the background) and write this script to the scratchpad as `numeria-shots.mjs`:

```js
import { createRequire } from "node:module";
const require = createRequire(process.cwd() + "/package.json");
const { chromium } = require("@playwright/test");

const out = process.argv[2] ?? ".";
const name = process.argv[3] ?? "Number Valley";
const slug = name.toLowerCase().replace(/ /g, "-");
const browser = await chromium.launch({ channel: "chrome", args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"] });
for (const [tag, viewport, mobile] of [["desktop", { width: 1440, height: 900 }, false], ["phone", { width: 390, height: 844 }, true]]) {
  const context = await browser.newContext({ viewport, isMobile: mobile, hasTouch: mobile });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(String(error)));
  await page.goto("http://127.0.0.1:3300/?world=math");
  await page.getByRole("button", { name: `Visit ${name}`, exact: true }).click();
  await page.getByRole("button", { name: `Explore ${name}`, exact: true }).click();
  await page.waitForTimeout(12000);
  await page.screenshot({ path: `${out}/${slug}-${tag}.png` });
  console.log(tag, "headings:", JSON.stringify(await page.getByRole("heading", { level: 1 }).allTextContents()), "page errors:", JSON.stringify(errors));
  await context.close();
}
await browser.close();
```

Run `node <scratchpad>/numeria-shots.mjs <scratchpad>` from `apps/web`, then look at `number-valley-desktop.png` and `number-valley-phone.png`. Check: the camera backdrop and the mission card show "Number Valley" and the first prompt; the bench shows four stepping stones with a glowing empty last stone and a "?"; three blue answer gems with legible numbers sit along the bottom, each with a faint ring; nothing overflows at 390 px. The fake camera has no hand, so no cursor appears. Fix colours, sizes and positions in `NumberValleySet.tsx` or `AnswerBenchScene.tsx` until the numbers read clearly at both sizes, then re-run the unit tests and amend nothing: make the fix a separate commit (`fix: ...`). Stop the server and Docker/Chrome processes afterwards.

- [ ] **Step 11: Stop for the owner's review**

Number Valley now works end to end. Report to the owner: what to open (Numeria, Visit Number Valley, Explore), and that the hold time (`DWELL_MS`, 1200 ms), the token hit size (`ANSWER_TOKEN_RADIUS`) and the celebration time (`CELEBRATE_MS`, 1500 ms) need a real hand to judge. Do not start Task 6 until the owner has looked at it.

---

### Task 6: Geometry Ridge and Crystal Crater sets

**Files:**
- Create: `apps/web/components/handActivity/answerSets/GeometryRidgeSet.tsx`
- Create: `apps/web/components/handActivity/answerSets/CrystalCraterSet.tsx`
- Modify: `apps/web/components/handActivity/answerSets/puzzleLayout.ts` (add `polygonPoints`, `crystalOffsets`)
- Modify: `apps/web/components/handActivity/answerSets/puzzleLayout.test.ts` (test them)
- Modify: `apps/web/components/handActivity/answerSets/index.ts` (register both)

**Interfaces:**
- Consumes: everything Task 4 produced (`AnswerSet`, `PuzzleProps`, `TokenProps`, `ANSWER_TOKEN_HOMES`, `ANSWER_TOKEN_RADIUS`, `NumberPlate`, `GemToken`, `Bench`, `benchX`, `benchY`).
- Produces: `polygonPoints(sides: number): { x: number; y: number }[]` (bench-space corner points of a regular polygon, flat side down, inside the puzzle area); `crystalOffsets(count: number): { x: number; y: number }[]` (bench-space offsets, centred on 0,0, for laying out a group of crystals without overlap); `GEOMETRY_RIDGE_SET`, `CRYSTAL_CRATER_SET: AnswerSet`.

- [ ] **Step 1: Extend the failing layout tests**

Add to `apps/web/components/handActivity/answerSets/puzzleLayout.test.ts`, changing the import line to `import { crystalOffsets, polygonPoints, stoneTrail } from "./puzzleLayout";` and appending:

```ts

describe("polygonPoints", () => {
  it("gives one corner per side, flat side down", () => {
    for (const sides of [3, 4, 6]) expect(polygonPoints(sides)).toHaveLength(sides);
    const square = polygonPoints(4);
    expect(square[0].y).toBeCloseTo(square[1].y);
  });

  it("keeps every corner on the bench, above the answer row", () => {
    for (const sides of [3, 4, 6]) {
      for (const point of polygonPoints(sides)) {
        expect(point.x).toBeGreaterThanOrEqual(.05);
        expect(point.x).toBeLessThanOrEqual(.95);
        expect(point.y).toBeGreaterThanOrEqual(.42);
        expect(point.y).toBeLessThanOrEqual(.98);
      }
    }
  });

  it("is centred left to right", () => {
    const hexagon = polygonPoints(6);
    const minX = Math.min(...hexagon.map((point) => point.x));
    const maxX = Math.max(...hexagon.map((point) => point.x));
    expect((minX + maxX) / 2).toBeCloseTo(.5, 1);
  });
});

describe("crystalOffsets", () => {
  it("gives one offset per crystal, centred on the origin", () => {
    for (const count of [2, 3, 4, 7]) {
      const offsets = crystalOffsets(count);
      expect(offsets).toHaveLength(count);
      const meanX = offsets.reduce((sum, point) => sum + point.x, 0) / count;
      expect(meanX).toBeCloseTo(0, 1);
    }
  });

  it("keeps neighbouring crystals from touching", () => {
    for (const count of [2, 4, 7]) {
      const offsets = crystalOffsets(count);
      for (let a = 0; a < offsets.length; a++) {
        for (let b = a + 1; b < offsets.length; b++) {
          const gap = Math.hypot(offsets[a].x - offsets[b].x, offsets[a].y - offsets[b].y);
          expect(gap, `${count} crystals: ${a} and ${b}`).toBeGreaterThanOrEqual(.16);
        }
      }
    }
  });

  it("draws nothing for none and one crystal at the centre", () => {
    expect(crystalOffsets(0)).toEqual([]);
    expect(crystalOffsets(1)).toEqual([{ x: 0, y: 0 }]);
  });
});
```

- [ ] **Step 2: Run it to verify it fails, then write the two layout helpers**

Run: `npx vitest run components/handActivity/answerSets/puzzleLayout.test.ts`
Expected: FAIL (`polygonPoints` and `crystalOffsets` not exported).

Append to `apps/web/components/handActivity/answerSets/puzzleLayout.ts`:

```ts

/** Corners of a regular polygon, flat side down, sized to sit in the puzzle area above the answer row. */
export function polygonPoints(sides: number): { x: number; y: number }[] {
  const radius = .27;
  const centerY = .68;
  const rotation = Math.PI / sides + Math.PI / 2;
  return Array.from({ length: sides }, (_, index) => {
    const angle = rotation + (index / sides) * Math.PI * 2;
    return { x: .5 + Math.cos(angle) * radius, y: centerY + Math.sin(angle) * radius * .82 };
  });
}

/** Offsets for a tidy grid of crystals, centred on the origin, in world units (not bench 0-1 space). */
export function crystalOffsets(count: number): { x: number; y: number }[] {
  if (count === 0) return [];
  const perRow = Math.min(count, 4);
  const rows = Math.ceil(count / perRow);
  const spacing = .26;
  return Array.from({ length: count }, (_, index) => {
    const row = Math.floor(index / perRow);
    const inRow = index === count - 1 && count % perRow !== 0 ? count % perRow : perRow;
    const col = index % perRow;
    return { x: (col - (inRow - 1) / 2) * spacing, y: (row - (rows - 1) / 2) * spacing };
  });
}
```

Run: `npx vitest run components/handActivity/answerSets/puzzleLayout.test.ts`
Expected: PASS (11 tests).

- [ ] **Step 3: Create the Geometry Ridge set**

Create `apps/web/components/handActivity/answerSets/GeometryRidgeSet.tsx`:

```tsx
"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Mesh } from "three";
import { ANSWER_TOKEN_HOMES, ANSWER_TOKEN_RADIUS, type AnswerSet, type PuzzleProps, type TokenProps } from "../answerSet";
import { benchX, benchY } from "../benchSpace";
import { Bench } from "../sets/setParts";
import { GemToken } from "./GemToken";
import { polygonPoints } from "./puzzleLayout";

function Scenery() {
  return <group>
    <Bench color="#6b4a2e" />
    <mesh position={[-.85, -.05, -.05]} scale={[1.2, 1.5, 1]}><coneGeometry args={[.55, 1, 4]} /><meshStandardMaterial color="#7a5738" roughness={.9} /></mesh>
    <mesh position={[.85, -.1, -.06]} scale={[1.35, 1.7, 1]}><coneGeometry args={[.6, 1, 4]} /><meshStandardMaterial color="#6a4c30" roughness={.9} /></mesh>
  </group>;
}

/** One steady corner light. Beacons light up left to right, counting to the answer, once the puzzle is solved. */
function Beacon({ x, y, lit, delay, reducedMotion }: { x: number; y: number; lit: boolean; delay: number; reducedMotion: boolean }) {
  const glow = useRef<Mesh>(null);
  const age = useRef(0);
  useFrame((_, rawDelta) => {
    age.current += Math.min(rawDelta, .05);
    if (!glow.current) return;
    const on = lit && (reducedMotion || age.current >= delay);
    glow.current.scale.setScalar(on ? 1 : .001);
  });
  return <group position={[x, y, .12]}>
    <mesh><sphereGeometry args={[.055, 16, 12]} /><meshStandardMaterial color="#a68a5c" roughness={.6} /></mesh>
    <mesh ref={glow}><sphereGeometry args={[.09, 16, 12]} /><meshBasicMaterial color="#ffe17d" transparent opacity={.85} /></mesh>
  </group>;
}

/** A polygon mountain with a beacon at each corner. A correct answer lights the beacons one by one, counting to it. */
function Puzzle({ challenge, answer, reducedMotion }: PuzzleProps) {
  const visual = challenge.visual;
  if (visual.kind !== "shape") return null;
  const sides = { triangle: 3, square: 4, hexagon: 6 }[visual.shape];
  const points = polygonPoints(sides);
  const litCount = answer !== null ? Number(answer) : 0;
  return <group>
    <mesh position={[benchX(.5), benchY(.68), .08]}>
      <ringGeometry args={[.001, .3, sides]} />
      <meshStandardMaterial color="#8a6f45" roughness={.8} />
    </mesh>
    {points.map((point, index) => <Beacon
      key={index}
      x={benchX(point.x)}
      y={benchY(point.y)}
      lit={index < litCount}
      delay={index * .35}
      reducedMotion={reducedMotion}
    />)}
  </group>;
}

function Token(props: TokenProps) {
  return <GemToken {...props} tint="#caa15a" />;
}

export const GEOMETRY_RIDGE_SET: AnswerSet = {
  region: "geometry-ridge",
  label: "Geometry Ridge workbench",
  visual: "shape",
  tokens: ANSWER_TOKEN_HOMES,
  tokenRadius: ANSWER_TOKEN_RADIUS,
  Scenery,
  Puzzle,
  Token,
};
```

- [ ] **Step 4: Create the Crystal Crater set**

Create `apps/web/components/handActivity/answerSets/CrystalCraterSet.tsx`:

```tsx
"use client";

import { ANSWER_TOKEN_HOMES, ANSWER_TOKEN_RADIUS, type AnswerSet, type PuzzleProps, type TokenProps } from "../answerSet";
import { benchX, benchY } from "../benchSpace";
import { Bench } from "../sets/setParts";
import { GemToken } from "./GemToken";
import { NumberPlate } from "./NumberPlate";
import { crystalOffsets } from "./puzzleLayout";

function Scenery() {
  return <group>
    <Bench color="#3a2d5a" />
    <mesh position={[0, -.02, -.05]} scale={[2.4, .8, 1]}><circleGeometry args={[.6, 40]} /><meshStandardMaterial color="#251c40" roughness={.9} /></mesh>
  </group>;
}

function Crystal({ x, y, ghost }: { x: number; y: number; ghost: boolean }) {
  return <mesh position={[x, y, ghost ? -.05 : .1]} scale={ghost ? .001 : 1}>
    <octahedronGeometry args={[.09]} />
    <meshStandardMaterial color="#b48cff" emissive="#8a5cff" emissiveIntensity={.4} roughness={.25} metalness={.15} flatShading />
  </mesh>;
}

/** Two groups of crystals with a plus or minus between them. Subtraction ghosts the crystals that roll away once solved. */
function Puzzle({ challenge, answer }: PuzzleProps) {
  const visual = challenge.visual;
  if (visual.kind !== "crystals") return null;
  const leftAt = { x: .27, y: .7 };
  const rightAt = { x: .73, y: .7 };
  const solved = answer !== null;
  const rightGhostCount = visual.operator === "-" && solved ? visual.right : 0;
  return <group>
    {crystalOffsets(visual.left).map((offset, index) => <Crystal key={index} x={benchX(leftAt.x) + offset.x} y={benchY(leftAt.y) + offset.y} ghost={false} />)}
    {crystalOffsets(visual.right).map((offset, index) => <Crystal key={index} x={benchX(rightAt.x) + offset.x} y={benchY(rightAt.y) + offset.y} ghost={index < rightGhostCount} />)}
    <group position={[benchX(.5), benchY(.7), .12]}>
      <NumberPlate text={visual.operator === "+" ? "+" : "−"} size={.34} color="#ffe17d" />
    </group>
  </group>;
}

function Token(props: TokenProps) {
  return <GemToken {...props} tint="#b48cff" />;
}

export const CRYSTAL_CRATER_SET: AnswerSet = {
  region: "crystal-crater",
  label: "Crystal Crater workbench",
  visual: "crystals",
  tokens: ANSWER_TOKEN_HOMES,
  tokenRadius: ANSWER_TOKEN_RADIUS,
  Scenery,
  Puzzle,
  Token,
};
```

- [ ] **Step 5: Register both sets**

In `apps/web/components/handActivity/answerSets/index.ts`, add the imports next to the existing one (`import { CRYSTAL_CRATER_SET } from "./CrystalCraterSet";` and `import { GEOMETRY_RIDGE_SET } from "./GeometryRidgeSet";`) and fill in the registry:

```ts
export const ANSWER_SETS: Partial<Record<MathHandRegion, AnswerSet>> = {
  "number-valley": NUMBER_VALLEY_SET,
  "geometry-ridge": GEOMETRY_RIDGE_SET,
  "crystal-crater": CRYSTAL_CRATER_SET,
};
```

- [ ] **Step 6: Run tests, typecheck, lint and commit**

Run: `npx vitest run components/handActivity/answerSets components/math/MathHandSession.test.tsx` (expected: `answerSets.test.ts` now runs its `describe.each` body for all three regions — 7 tests × 3 regions plus the 1 registry test — and `MathHandSession.test.tsx`'s `it.each(regions)` full-playthrough test now runs for Geometry Ridge and Crystal Crater too, since it iterates `Object.keys(ANSWER_SETS)`).

Run `npx tsc --noEmit` and `npx eslint components/handActivity` (expected: no output).

```bash
git add apps/web/components/handActivity/answerSets
git commit -m "feat: add the Geometry Ridge and Crystal Crater workbenches"
```

---

### Task 7: Switch every region and remove the old quiz

**Files:**
- Modify: `apps/web/components/math/MathPlanetCanvas.tsx`
- Modify: `apps/web/components/math/MathPlanetCanvas.test.tsx`
- Delete: `apps/web/components/math/MathActivitySession.tsx`, `apps/web/components/math/MathActivitySession.module.css`, `apps/web/components/math/MathActivitySession.test.tsx`
- Delete: `apps/web/tests/browser/activity-session-focus.spec.ts`

Note: `MathHandSession.test.tsx` needs no change here. Its `it.each(regions)` (Task 5) already iterates `Object.keys(ANSWER_SETS)`, so Task 6 filling in Geometry Ridge and Crystal Crater made it cover all three regions automatically.

**Interfaces:**
- Consumes: `MathHandSession`, `answerSetFor` (Tasks 4-6, now covering all three field regions).
- Produces: nothing new; `MathPlanetCanvas` opens `MathHandSession` for every region except Fraction Forest.

- [ ] **Step 1: Simplify `MathPlanetCanvas`**

`handSession` is now true for every non-mission region, so the old branch and the light overlay it used are dead code. In `apps/web/components/math/MathPlanetCanvas.tsx`:

1. Remove the import `import { MathActivitySession } from "./MathActivitySession";`.
2. Change the Task 5 import `import { answerSetFor, type MathHandRegion } from "../handActivity/answerSets";` to `import type { MathHandRegion } from "../handActivity/answerSets";` (the region-shaped cast is still used below; `answerSetFor` no longer is).
3. Remove the `const handSession = ...` line and replace the two-branch overlay block with the single hand-session branch:

```tsx
    {session ? <div className={styles.handOverlay} data-session-controls>
      <MathHandSession key={session} region={session as MathHandRegion} onComplete={completeRegion} onClose={closeSession} />
    </div> : null}
```

4. In `apps/web/components/math/mathPlanet.module.css`, delete the now-unused `.sessionOverlay` and `.sessionToolbar` rules (the `.handOverlay` rule from Task 5 stays).

- [ ] **Step 2: Update the Numeria canvas tests**

Run from `apps/web`:

```bash
python - <<'EOF'
p = "components/math/MathPlanetCanvas.test.tsx"
s = open(p, encoding="utf-8").read()

# Every field region is hand-played now.
s = s.replace(
    'const fieldRegions = regions.filter((landmark) => landmark.id !== "fraction-forest" && landmark.id !== "number-valley");',
    'const fieldRegions = regions.filter((landmark) => landmark.id !== "fraction-forest");',
)

# The generic "selects region and opens its activity" test used a radio group; it now checks the hand session shape instead.
old = '''it.each(fieldRegions)("selects $name through the scene and opens its activity", (region) => {
  render(<MathPlanetCanvas onBackToWorlds={vi.fn()} />);
  act(() => state.props.onLandmarkSelect?.(region.id));
  expect(screen.getByRole("button", { name: `Visit ${region.name}` }).getAttribute("aria-pressed")).toBe("true");
  expect(state.props.destination).toEqual(region.destination);
  expect(state.props.mode).toBe("follow");
  fireEvent.click(screen.getByRole("button", { name: `Explore ${region.name}` }));
  const dialog = screen.getByRole("dialog", { name: `${region.name} activity session` });
  expect(within(dialog).getByRole("heading", { name: MATH_ACTIVITIES[region.id as MathRegionId].challenges[0].prompt })).toBeTruthy();
});'''
new = '''it.each(fieldRegions)("selects $name through the scene and opens its hand-played activity", (region) => {
  render(<MathPlanetCanvas onBackToWorlds={vi.fn()} />);
  act(() => state.props.onLandmarkSelect?.(region.id));
  expect(screen.getByRole("button", { name: `Visit ${region.name}` }).getAttribute("aria-pressed")).toBe("true");
  expect(state.props.destination).toEqual(region.destination);
  expect(state.props.mode).toBe("follow");
  fireEvent.click(screen.getByRole("button", { name: `Explore ${region.name}` }));
  const dialog = screen.getByRole("dialog", { name: `${region.name} activity session` });
  expect(within(dialog).getByRole("heading", { name: region.name })).toBeTruthy();
  expect(answers.props?.challenge.id).toBe(MATH_ACTIVITIES[region.id as MathRegionId].challenges[0].id);
});'''
assert old in s
s = s.replace(old, new, 1)

# The Geometry Ridge radio-quiz walkthroughs are replaced by the same hand-session shape the Number Valley tests use.
start = s.index('it("offers an explicit close button before completing an activity"')
end = s.index('it("opens Number Valley as a camera-first hand session with no radio buttons"')
replacement = '''it("offers an explicit close button before completing an activity", () => {
  const onSessionOpenChange = vi.fn();
  render(<MathPlanetCanvas onBackToWorlds={vi.fn()} onSessionOpenChange={onSessionOpenChange} />);
  visit("Geometry Ridge");
  fireEvent.click(screen.getByRole("button", { name: "Explore Geometry Ridge" }));
  fireEvent.click(screen.getByRole("button", { name: "Back to Numeria" }));
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(onSessionOpenChange.mock.calls).toEqual([[true], [false]]);
  expect(screen.getByText("0 of 4 regions complete")).toBeTruthy();
});

it("marks only the completed region and announces it after returning", () => {
  const onSessionOpenChange = vi.fn();
  render(<MathPlanetCanvas onBackToWorlds={vi.fn()} onSessionOpenChange={onSessionOpenChange} />);
  fireEvent.click(screen.getByRole("button", { name: "Visit Geometry Ridge" }));
  fireEvent.click(screen.getByRole("button", { name: "Explore Geometry Ridge" }));
  for (const challenge of MATH_ACTIVITIES["geometry-ridge"].challenges) {
    act(() => answers.props!.onSelect(challenge.answer));
    act(() => { vi.advanceTimersByTime(CELEBRATE_MS + 50); });
  }
  fireEvent.click(screen.getByRole("button", { name: "Back to Numeria" }));
  expect(onSessionOpenChange.mock.calls).toEqual([[true], [false]]);
  const announcement = screen.getByText("Wonderful exploring! Geometry Ridge complete.");
  expect(announcement.getAttribute("aria-live")).toBe("polite");
  expect(screen.getByText("1 of 4 regions complete")).toBeTruthy();
  const completed = screen.getByRole("button", { name: "Visit Geometry Ridge" });
  expect(document.getElementById(completed.getAttribute("aria-describedby") ?? "")?.textContent).toBe("Complete");
  expect(within(completed).getAllByText("Complete").filter((node) => node.getAttribute("aria-hidden") === "true")).toHaveLength(1);
  for (const region of regions.filter((entry) => entry.id !== "geometry-ridge")) {
    const other = screen.getByRole("button", { name: `Visit ${region.name}` });
    expect(other.getAttribute("aria-describedby")).toBeNull();
    expect(within(other).queryByText("Complete")).toBeNull();
  }
});

'''
s = s[:start] + replacement + s[end:]

# Wrap the fake-timer tests introduced for Number Valley to use real timers by default; this test file now needs
# fake timers throughout wherever a hand-session completion is driven, so make it consistent for Geometry Ridge too
# by removing the local vi.useFakeTimers()/vi.useRealTimers() pair from the Number Valley completion test, since the
# whole describe block below now shares one pattern.
open(p, "w", encoding="utf-8").write(s)
EOF
```

Since every field region now uses the hand session, the "announces a missing mapping" test (which deletes `MATH_ACTIVITIES["number-valley"]`) still applies unchanged — it never opens a session.

- [ ] **Step 3: Delete the old quiz and its test**

```bash
git rm apps/web/components/math/MathActivitySession.tsx apps/web/components/math/MathActivitySession.module.css apps/web/components/math/MathActivitySession.test.tsx apps/web/tests/browser/activity-session-focus.spec.ts
```

- [ ] **Step 4: Run the unit suites, typecheck, lint and list the browser specs**

Run: `npx vitest run components/math components/handActivity` (expected: every file passes; `MathActivitySession.test.tsx` no longer exists), then `npx tsc --noEmit` and `npx eslint components tests` (expected: no output), then `npx playwright test --list` (expected: no `activity-session-focus` entries).

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/math apps/web/components/handActivity
git commit -m "feat: play every Numeria field region with the hand, and remove the old quiz"
```

---

### Task 8: Browser tests, docs and full verification

**Files:**
- Create: `apps/web/tests/browser/numeria-hand-sessions.spec.ts`
- Modify: `design-qa.md` (record what was and was not verified)

**Interfaces:**
- Consumes: `denyCamera(page)`, `launchNumeria(page)` from `tests/browser/helpers.ts`.
- Produces: a browser spec proving the camera is requested on entry for all three field regions, a blocked camera shows the adult screen with a working Try again, no radio-button or button fallback exists for answering, and Escape and layout behave.

- [ ] **Step 1: Write the browser spec**

Create `apps/web/tests/browser/numeria-hand-sessions.spec.ts`:

```ts
import { expect, test } from "@playwright/test";
import { denyCamera, launchNumeria } from "./helpers";

const REGIONS = ["Number Valley", "Geometry Ridge", "Crystal Crater"] as const;

test("the Numeria field regions ask for the camera on entry and show adult help when it is blocked", async ({ page }, info) => {
  test.setTimeout(120000);
  await denyCamera(page);
  await page.goto("/?world=math");
  await launchNumeria(page);
  const calls = () => page.evaluate(() => (window as unknown as { __magnetCameraCalls(): number }).__magnetCameraCalls());
  for (const region of REGIONS) {
    await page.getByRole("button", { name: `Visit ${region}`, exact: true }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    const before = await calls();
    await page.getByRole("button", { name: `Explore ${region}`, exact: true }).click();
    const dialog = page.getByRole("dialog", { name: `${region} activity session` });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("heading", { name: "Ask an adult to turn on the camera" })).toBeVisible();
    expect(await calls()).toBeGreaterThan(before);
    await expect(dialog.getByRole("radio")).toHaveCount(0);
    await expect(dialog.getByRole("button", { name: "Check answer" })).toHaveCount(0);
    await dialog.getByRole("button", { name: "Try again", exact: true }).click();
    await expect.poll(calls).toBeGreaterThan(before + 1);
    await page.screenshot({ path: info.outputPath(`${region.toLowerCase().replace(/ /g, "-")}-adult-help-${info.project.name}.png`) });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.getByRole("region", { name: "Explore Numeria" })).toBeVisible();
  }
});

test("Fraction Forest still opens the real mission, unaffected by the camera", async ({ page }) => {
  await denyCamera(page);
  await page.goto("/?world=math");
  await launchNumeria(page);
  await page.getByRole("button", { name: "Explore Fraction Forest", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Fraction Forest activity session" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Ask an adult to turn on the camera" })).toHaveCount(0);
});
```

- [ ] **Step 2: Typecheck, lint and list the spec**

Run: `npx tsc --noEmit` and `npx eslint tests` (expected: no output), then `npx playwright test tests/browser/numeria-hand-sessions.spec.ts --list` (expected: both new test names).

- [ ] **Step 3: Full unit, type and lint pass**

Run: `npx tsc --noEmit`, `npx eslint .`, then `npx vitest run --maxWorkers=3`
Expected: no typecheck or lint output; every test file passes. Record the file and test counts for `design-qa.md`.

- [ ] **Step 4: Rebuild and run the browser specs that touch Numeria**

From the repo root: `NODE_OPTIONS=--max-old-space-size=2048 npm run build --workspace=@wiggle/web`. Then from `apps/web`, in this order (each is its own command to keep memory use down):

```bash
npx playwright test tests/browser/numeria-hand-sessions.spec.ts --project=desktop
npx playwright test tests/browser/numeria-hand-sessions.spec.ts --project=mobile
npx playwright test tests/browser/universe.spec.ts tests/browser/hover-contrast.spec.ts --project=desktop
npx playwright test tests/browser/subject-worlds.spec.ts tests/browser/mission.spec.ts --project=desktop
```

Expected: all pass. If `hover-contrast` fails on a Numeria control, the cause is the frame styles this work reused, not the sets; inspect the failing element before changing anything.

- [ ] **Step 5: Real-camera check (owner, on a device with a camera)**

Automated tests cannot exercise real hand tracking. Ask the owner to open each of Number Valley, Geometry Ridge and Crystal Crater with a real camera and confirm: the camera permission prompt appears on entry; pointing at, or holding an open hand over, an answer token fills a ring; a full ring chooses that answer; a wrong answer wobbles the token and repeats the hint; a right answer sparkles and moves on after about 1.5 seconds; losing the hand never chooses anything; denying the camera shows "Ask an adult" and Try again works; Fraction Forest is unaffected. Record the result in `design-qa.md` as either confirmed or not yet checked.

- [ ] **Step 6: Record what was verified**

Add this section to `design-qa.md`, directly above the heading `## Camera-first Science lands — 21 September 2026`, filling in the counts from Steps 3 and 4 and the outcome of Step 5:

```markdown
## Camera-first Numeria regions — <date>

result: automated checks pass; real-camera play is <confirmed by the owner on <device> | not yet checked>.

Number Valley, Geometry Ridge and Crystal Crater now open the camera on entry and are played only with the hand, pointing and holding over an answer token on a 3D workbench inside the shared camera-first frame (`components/handActivity/`). The camera is required: a blocked or missing camera shows "Ask an adult to turn on the camera" with Try again, and there is no radio-button or keyboard fallback for answering. Escape and the exit button still work. Fraction Forest keeps its API-backed mission, unchanged; Magnet Lands and the three Science lands are unchanged.

Checked: <N> web unit files / <M> tests pass, including the extracted bench canvas and bench space against the unchanged Round 1 tests, the pure dwell selector and puzzle reducer, a per-region set-consistency test against the lesson data, and a full puzzle-by-puzzle play for every region with simulated hand selections including wrong answers, hand loss and a re-open restart. Browser: the numeria-hand-sessions spec (camera requested on entry for all three regions, adult help and Try again, no radio buttons, Escape, no horizontal scroll, Fraction Forest unaffected) passes at desktop and 390 px, and universe, hover-contrast, subject-worlds and mission still pass. The three workbenches were inspected in screenshots at 1440 x 900 and 390 x 844.

Not verifiable automatically: real hand tracking (the 1200 ms hold, the 300 ms leave grace, tracking-loss reset). All three rounds of the camera-first effort are now complete for the lands and regions in scope; moving Magnet Lands onto the shared frame remains optional future work.
```

- [ ] **Step 7: Commit**

```bash
git add apps/web/tests/browser/numeria-hand-sessions.spec.ts design-qa.md
git commit -m "test: cover the camera-first Numeria regions and record the verification"
```

Do not push unless the owner asks.

---

## Self-review

- **Spec coverage:** camera required, point-and-hold answering, full custom 3D bench per region (Decisions; Tasks 4-8); the play flow including dwell fill, the leave-grace allowance, wrong-answer wobble and hint, and celebration timing (Task 3's `answerReducer` and Task 4's scene, wired in Task 5); the three puzzle looks — stepping-stone trail, polygon beacons, crystal groups (Tasks 4 and 6); reuse of `BenchCanvas`/`benchSpace`/`MatchBurst` and behaviour-preserving Round 1 refactor (Task 1); failure states and accessibility — adult-help screen, reduced motion, the single live region, Escape/exit, on-device inference (all tasks, via the reused `HandActivityShell`); testing at every level named in the spec plus the manual real-camera step (Tasks 1-8); removal of the radio-button quiz and its focus spec (Task 7); docs (Task 8). Out-of-scope items (Fraction Forest, Magnet Lands, `MATH_ACTIVITIES` content, progress persistence, the parent space) are untouched by every task.
- **Type consistency:** `AnswerState`, `AnswerRules`, `AnswerAction`, `AnswerPhase` (Task 3) flow unchanged into `AnswerBenchScene` (Task 4), `MathHandSession` (Task 5) and its test. `AnswerSet`, `PuzzleProps`, `TokenProps`, `ANSWER_TOKEN_HOMES`, `ANSWER_TOKEN_RADIUS` (Task 4) are used identically by all three sets (Tasks 4 and 6) and by `answerSets.test.ts`'s `describe.each`. `MathHandRegion` and `ANSWER_SETS`/`answerSetFor` (Tasks 4 and 5) match every consumer's import. `DwellSelector`'s `DwellInput`/`DwellOutput` (Task 2) match the one call site in `AnswerBenchScene` (Task 4). `benchX`/`benchY`/`BENCH_WIDTH`/`BENCH_HEIGHT` and `BenchCanvas`'s props (Task 1) are used the same way by both scenes.
- **Placeholders:** none; every code step contains the code. The `<date>`, `<N>`, `<M>` and device markers in the `design-qa.md` template are filled in from real results at that step, and the step says so.
