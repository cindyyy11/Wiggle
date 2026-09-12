# 3D Hand-Gesture Interaction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Fraction Forest's four-zone gesture selector with a reusable, local-first 3D hand interaction system where point, pinch, fist, and open palm target real scene objects and the child can complete the pizza mission through physical slice placement.

**Architecture:** MediaPipe remains dynamically loaded in the browser, but camera lifecycle, geometry, smoothing, and stable gesture phases move into focused gesture modules. A React Three Fiber interaction layer converts the smoothed hand pointer to a ray, focuses tagged scene objects, drags slices on a depth-locked plane, and emits semantic actions to `MissionAtlas`. Mission state remains the source of truth for both hand and fallback controls; contracts and API validation accept only privacy-safe semantic gesture events.

**Tech Stack:** Next.js 15, React 19, TypeScript, React Three Fiber, Three.js, MediaPipe Tasks Vision, Vitest, Testing Library, Playwright, existing FastAPI/Supabase event contracts.

**Spec:** `docs/superpowers/specs/2026-09-12-3d-hand-gesture-interaction-design.md`

## Global Constraints

- Hand tracking runs locally in the browser; webcam video and raw landmarks are never uploaded, recorded, or persisted.
- Camera permission is opt-in, failure-safe, and never removes mouse, touch, keyboard, or 2D fallback play.
- Supported gestures are `pinch`, `point`, `open_palm`, and `fist`; stable activation and release are required before actions fire.
- Inference is bounded to at most 20 FPS and must not drive React renders every frame; R3F rendering remains independent.
- Pinch and fist dragging use a stable interaction plane at the selected object's depth and release safely after a 400 ms lost-hand grace period.
- Point focuses real interactive 3D objects; open palm activates only the real Lexi beacon; pinch and fist manipulate real pizza slices.
- The third correctly placed slice completes the mission and queues `gesture_task_completed` without direct Digital Twin mutation.
- Existing uncommitted user changes in `MissionAtlas.tsx`, `mission.module.css`, brand assets, and unrelated docs must not be reverted or included accidentally.

---

### Task 1: Gesture configuration, geometry, and stable tracking API

**Files:**
- Create: `apps/web/features/gestures/config.ts`
- Create: `apps/web/features/gestures/handMath.ts`
- Create: `apps/web/features/gestures/gestureStateMachine.ts`
- Create: `apps/web/features/gestures/useHandTracking.ts`
- Modify: `apps/web/features/gestures/gestureClassifier.ts`
- Modify: `apps/web/features/gestures/handLandmarker.ts`
- Modify: `apps/web/features/gestures/useGestureControls.ts`
- Test: `apps/web/features/gestures/handMath.test.ts`
- Test: `apps/web/features/gestures/gestureStateMachine.test.ts`
- Test: `apps/web/features/gestures/useHandTracking.test.tsx`

**Interfaces:**
- `GESTURE_CONFIG` exposes `pinchRatio`, `minConfidence`, `stableHoldMs`, `releaseMs`, `lostHandGraceMs`, `pointerSmoothing`, `pointerDeadZone`, and `maxInferenceFps`.
- `PointerNdc` is `{ x: number; y: number }` bounded to `-1..1`.
- `GesturePhase` is `{ type: "start" | "hold" | "end"; gesture: Gesture; at: number }`.
- `useHandTracking({ enabled, onGestureStart, onGestureHold, onGestureEnd })` returns `{ video, status, gesture, pointer, handedness, confidence, isTracking }`.
- The existing `useGestureControls` remains a compatibility adapter for current UI callers until Task 5 migrates them.

- [ ] **Step 1: Write failing geometry/state tests.** Cover rotated finger extension, scale-normalized pinch, mirrored pointer mapping, EMA/dead-zone smoothing, stable start/hold/end, gesture switching, and 400 ms loss grace.
- [ ] **Step 2: Run focused tests and verify they fail for missing helpers/state machine.**

Run: `npm run test --workspace=@wiggle/web -- features/gestures/handMath.test.ts features/gestures/gestureStateMachine.test.ts`

- [ ] **Step 3: Implement the centralized config and pure math/state-machine modules.** Keep all timing and thresholds in `config.ts`; avoid frame-by-frame React state.
- [ ] **Step 4: Update classification and MediaPipe adapter.** Preserve the 21-landmark contract, improve finger geometry for hand rotation, and expose the index pointer plus handedness/confidence.
- [ ] **Step 5: Implement `useHandTracking`.** Dynamically load the tracker after camera grant, cap inference at `maxInferenceFps`, clean up tracks/model/RAF on every exit path, and emit phase callbacks.
- [ ] **Step 6: Run focused tests and the existing camera-hook tests.**

Run: `npm run test --workspace=@wiggle/web -- features/gestures/handMath.test.ts features/gestures/gestureStateMachine.test.ts features/gestures/gestureClassifier.test.ts features/gestures/useHandTracking.test.tsx features/gestures/useGestureControls.test.tsx`

- [ ] **Step 7: Commit:** `feat: add stable hand tracking interaction API`

### Task 2: Pure 3D interaction controller

**Files:**
- Create: `apps/web/components/universe/gestureInteraction.ts`
- Test: `apps/web/components/universe/gestureInteraction.test.ts`

**Interfaces:**
- `InteractiveTarget` is `{ id: string; role: "pizza-slice" | "plate" | "lexi-beacon"; object: Object3D }`.
- `GestureInteractionAction` is `{ type: "focus" | "grab" | "move" | "drop" | "open-lexi" | "lost-hand"; gesture?: Gesture; targetId?: string; position?: Vector3; success?: boolean }`.
- `GestureInteractionController.update(input)` consumes pointer, gesture phase, raycast target, target point, and timestamp; it returns zero or more semantic actions.
- `createInteractionPlane(object, camera)` creates a depth-locked plane and never moves the object toward the camera.

- [ ] **Step 1: Write failing controller tests.** Cover point focus, pinch acquisition, fist acquisition, plane movement, valid/invalid drop, placed-slice regrab, open-palm Lexi activation, gesture conflict ordering, and lost-hand release.
- [ ] **Step 2: Run the controller tests to verify they fail.**

Run: `npm run test --workspace=@wiggle/web -- components/universe/gestureInteraction.test.ts`

- [ ] **Step 3: Implement the controller as pure state transitions.** Keep raycasting/Three object references at the boundary, make action ordering deterministic, and apply lerp smoothing to target transforms.
- [ ] **Step 4: Run the controller tests and inspect the diff for camera-depth jumps.**
- [ ] **Step 5: Commit:** `feat: add 3d gesture interaction controller`

### Task 3: R3F scene bridge and physical pizza presentation

**Files:**
- Create: `apps/web/components/universe/GestureInteractionLayer.tsx`
- Modify: `apps/web/components/universe/world.ts`
- Modify: `apps/web/components/universe/UniverseScene.tsx`
- Modify: `apps/web/components/universe/UniverseCanvas.tsx`
- Modify: `apps/web/components/universe/Landmarks.tsx`
- Modify: `apps/web/components/universe/universe.module.css`
- Test: `apps/web/components/universe/GestureInteractionLayer.test.tsx`
- Test: `apps/web/components/universe/Landmarks.test.tsx`

**Interfaces:**
- `PizzaPresentation` gains controlled slice states, plate target metadata, and an `onGestureAction` callback while preserving the accessible slice-button callback.
- `GestureInteractionLayer` consumes `{ pointer, gesture, phase, enabled }` and `targets`, and emits `GestureInteractionAction` without owning mission correctness.
- Pizza slices are tagged with `userData.interactive`, `userData.objectId`, and `userData.role`; the plate and Lexi beacon are tagged similarly.

- [ ] **Step 1: Write failing scene tests.** Assert stable object IDs/roles, focus feedback, pinch/fist drag actions, plate target highlight, and that the 2D map still exposes equivalent buttons.
- [ ] **Step 2: Run the scene tests to verify missing tags/bridge fail.**

Run: `npm run test --workspace=@wiggle/web -- components/universe/GestureInteractionLayer.test.tsx components/universe/Landmarks.test.tsx components/universe/UniverseCanvas.test.tsx`

- [ ] **Step 3: Add controlled semantic pizza state and tagged meshes.** Keep the current visual style, lift held/focused slices subtly, show plate acceptance feedback, and make placed slices visibly sit on the plate.
- [ ] **Step 4: Mount the interaction layer inside `UniverseScene` and thread props through `UniverseCanvas`.** Store per-frame pointer/drag values in refs and keep DOM overlays outside the Canvas.
- [ ] **Step 5: Add the child-facing hand cursor/tracking status overlay.** Add a developer-only `?handDebug=1` view without exposing landmarks by default.
- [ ] **Step 6: Run scene, universe, and fallback tests.**
- [ ] **Step 7: Commit:** `feat: connect hand gestures to 3d pizza scene`

### Task 4: Mission state, automatic completion, and semantic telemetry

**Files:**
- Modify: `apps/web/components/mission/MissionAtlas.tsx`
- Modify: `apps/web/components/mission/FractionMission.tsx`
- Modify: `apps/web/components/mission/GestureControls.tsx`
- Modify: `apps/web/components/mission/mission.module.css`
- Modify: `apps/web/features/gestures/commands.ts`
- Modify: `packages/contracts/src/events.ts`
- Modify: `apps/api/app/schemas.py`
- Modify: `apps/api/app/routes/events.py`
- Modify: `supabase/migrations/20260912000000_reality_mission_events.sql`
- Test: `apps/web/tests/mission/gesture-3d-completion.test.tsx`
- Test: `apps/web/tests/accessibility/input-equivalence.test.tsx`
- Test: `packages/contracts/src/contracts.test.ts`
- Test: `apps/api/tests/routes/test_review_regressions.py`

**Interfaces:**
- `MissionInputCommands` adds `focusSlice`, `placeSlice`, `returnSlice`, and `openLexi` while retaining safe button/fallback commands.
- New typed event payloads carry only logical gesture/object IDs and bounded success fields; no coordinates, landmarks, or camera data.
- `MissionAtlas` owns `placedSlices`, validates plate drops, automatically completes at three, and emits `gesture_task_completed` once.

- [ ] **Step 1: Add contract/API tests for the new event names and payload validation.** Reject raw coordinates, images, landmarks, and unknown object IDs.
- [ ] **Step 2: Run contract/API tests to verify the new event types fail before implementation.**
- [ ] **Step 3: Implement the typed event union, FastAPI validation, and forward SQL event constraint/migration.** Keep the Digital Twin update path unchanged; events enter the existing queue.
- [ ] **Step 4: Write failing mission integration tests.** Simulate point focus, pinch placement, fist placement, open-palm Lexi, invalid drop recovery, third-slice auto-completion, and fallback completion equivalence.
- [ ] **Step 5: Implement mission commands and connect scene actions.** Deduplicate completion, preserve the existing reward/success animation, stop camera input after completion, and keep manual “Check my pizza” available as an accessible fallback.
- [ ] **Step 6: Update GestureControls copy and permission/error states to match the child-facing flow.**
- [ ] **Step 7: Run focused mission, contract, and API tests.**
- [ ] **Step 8: Commit:** `feat: complete gesture pizza mission telemetry`

### Task 5: End-to-end verification, docs, and regression repair

**Files:**
- Modify: `apps/web/components/mission/README.md`
- Modify: `apps/web/components/universe/README.md`
- Modify: `apps/web/tests/browser/supports.spec.ts`
- Modify: `apps/web/tests/browser/mission.spec.ts`
- Modify: `apps/web/e2e/hero-loop.spec.ts`
- Modify: `apps/web/e2e/fallbacks.spec.ts`
- Test: `apps/web/tests/browser/hand-gesture-flow.spec.ts`

- [ ] **Step 1: Add a browser test with mocked camera/model output.** Verify the complete route, no upload request, gesture-driven three-slice completion, Lexi open-palm interaction, and camera cleanup.
- [ ] **Step 2: Repair existing mission/accessibility fixtures for the current uncommitted splash behavior without reverting that user change.** Keep the tests' semantic assertions intact.
- [ ] **Step 3: Document the user flow and developer debug switch.** Include the exact route: `Let's Wiggle → Numeria → Fraction Forest → Start fractions mission → Gesture`.
- [ ] **Step 4: Run focused suites, then the full web test, typecheck, lint, and build.**

Run: `npm run test --workspace=@wiggle/web`

Run: `npm run typecheck --workspace=@wiggle/web`

Run: `npm run lint --workspace=@wiggle/web`

Run: `npm run build --workspace=@wiggle/web`

- [ ] **Step 5: Commit:** `test: verify complete 3d gesture flow`

---

## Execution Notes

- Work only in the existing checkout and preserve unrelated dirty files. Each task commit must stage only its listed files.
- Keep implementation commits small enough for a reviewer to isolate regressions.
- If a browser camera/model cannot be made deterministic in CI, keep the mocked browser path as the automated gate and report the real-device matrix separately; never weaken privacy or fallback assertions.
