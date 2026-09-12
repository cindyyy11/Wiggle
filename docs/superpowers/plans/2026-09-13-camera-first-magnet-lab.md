# Camera-First Magnet Lab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the button-only Magnet Lab with a child-facing 3D workbench whose large magnet is controlled by a required local camera hand gesture.

**Architecture:** `useHandTracking` becomes a reliable local pointer publisher and exposes retryable camera states. Framework-free Magnet Lab state/geometry modules make hand-to-table movement, attraction, checkpoint progression, and voluntary releases testable. `MagnetLabMission` becomes the camera-first shell around a new React Three Fiber workbench scene and never presents a mouse/touch learning fallback when the camera is denied.

**Tech Stack:** Next.js 15, React, TypeScript, React Three Fiber, Three.js, Vitest, React Testing Library, Playwright.

**Spec:** `docs/superpowers/specs/2026-09-13-magnet-hand-control-design.md`

## Global Constraints

- Work on branch `feature/learner-twin-voice-mission-control`; preserve all unrelated working-tree changes.
- Do not add dependencies, remote services, network requests, or image assets.
- Camera/video/inference stays local; tracks stop and the tracker closes when the Magnet Lab exits, unmounts, or the page hides.
- Opening Magnet Lab starts the camera request automatically; remove the old `Use hand gestures`, object-test, and click/touch learning fallback controls.
- Denied/unavailable camera presents `Ask an adult to turn on the camera` and exactly one retry action; it must not bypass browser permission.
- Use the existing four-object curriculum: paper clip and iron nail attract; wooden block and plastic button do not.
- Checkpoint 1 uses open-hand/pointer magnet movement; checkpoint 2 uses pinch-to-grab and voluntary open-palm release; checkpoint 3 uses pointing/pinching to investigate the hidden magnet.
- Lost, low-confidence, malformed, or hidden-camera hand data clears visual tracking after the configured 400 ms grace period and never observes, sorts, or investigates anything.
- Preserve keyboard support for exit/retry, dialog focus containment, focus return, reduced-motion preference, mobile fit, and existing subject-world / WebGL fallback routes.

## File Structure

- `apps/web/features/gestures/useHandTracking.ts` — retryable local camera lifecycle and safe raw-pointer publication.
- `apps/web/features/gestures/useHandTracking.test.tsx` — camera state, retry, cleanup, and unclassified-pointer hook coverage.
- `apps/web/components/science/magnetHandPlay.ts` — pure table mapping, attraction and three-checkpoint reducer/state.
- `apps/web/components/science/magnetHandPlay.test.ts` — geometry, curriculum, progress and non-scoring loss tests.
- `apps/web/components/science/magnetHandGesture.ts` — pure pinch/release/investigate controller with tracking-loss grace.
- `apps/web/components/science/magnetHandGesture.test.ts` — semantic gesture transition tests.
- `apps/web/components/science/MagnetHandLabScene.tsx` — isolated R3F workbench, magnet, object and campsite visuals.
- `apps/web/components/science/MagnetLabMission.tsx` — camera-first session orchestration, adult-help state, accessible overlay and focus restoration.
- `apps/web/components/science/magnetLab.module.css` — responsive reference-inspired mission, camera, guide and stage styling.
- `apps/web/components/science/MagnetLabMission.test.tsx` — component-level auto-camera, help, retry, completion and cleanup tests.
- `apps/web/tests/browser/magnet-lab-camera.spec.ts` — browser lifecycle/denial/mobile/reduced-motion coverage.
- `apps/web/tests/browser/subject-worlds.spec.ts` — update retired manual-Magnet helper expectations.

---

### Task 1: Make local hand tracking retryable and continuously publish safe pointers

**Files:**
- Modify: `apps/web/features/gestures/useHandTracking.ts`
- Modify: `apps/web/features/gestures/useHandTracking.test.tsx`

**Interfaces:**
- Produces:
  ```ts
  export type CameraStatus = "off" | "starting" | "ready" | "denied" | "unavailable";
  export interface HandTrackingLatest {
    pointer: PointerNdc | null;
    gesture: Gesture | null;
    handedness: string | null;
    confidence: number;
    isTracking: boolean;
  }
  export interface HandTrackingState {
    video: React.RefObject<HTMLVideoElement | null>;
    status: CameraStatus;
    latest: React.RefObject<HandTrackingLatest>;
    retry(): void;
  }
  ```
- Consumed by Task 4 through `latest`, `status`, `video`, and `retry`.

- [ ] **Step 1: Write failing hook tests for a confident unclassified pointer, denial, unavailable hardware, and retry**

  In `useHandTracking.test.tsx`, use a controllable `requestAnimationFrame` callback and a fake hand tracker. Build a valid 21-landmark frame with `confidence: .98` that returns `null` from `classifyHand`, then assert `latest.current.pointer` is mirrored and `latest.current.gesture` is null. Add these cases:

  ```tsx
  expect(result.current.latest.current.isTracking).toBe(true);
  expect(result.current.latest.current.pointer).toEqual({ x: 0.6, y: -0.2 });
  expect(result.current.status).toBe("denied");

  result.current.retry();
  expect(getUserMedia).toHaveBeenCalledTimes(2);
  ```

  Simulate `new DOMException("Denied", "NotAllowedError")` for `denied`, a generic error for `unavailable`, and low confidence/malformed pointer data to assert `pointer === null` and `isTracking === false`.

- [ ] **Step 2: Run the focused hook test to verify it fails**

  Run:
  ```powershell
  npm run test --workspace=@wiggle/web -- --run features/gestures/useHandTracking.test.tsx
  ```

  Expected: FAIL because `retry`, `denied`, and raw-pointer publication do not yet exist.

- [ ] **Step 3: Add an attempt key, exact error states, and pointer publication independent of classification**

  In `useHandTracking.ts`:

  ```ts
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => setAttempt(value => value + 1), []);
  const confidentPointer = frame && frame.confidence >= GESTURE_CONFIG.minConfidence
    ? frame.pointer ?? frame.landmarks[8]
    : null;

  latest.current.pointer = confidentPointer && Number.isFinite(confidentPointer.x) && Number.isFinite(confidentPointer.y)
    ? smoothPointer(latest.current.pointer, mirroredPointerNdc(confidentPointer), GESTURE_CONFIG.pointerSmoothing, GESTURE_CONFIG.pointerDeadZone)
    : null;
  latest.current.isTracking = Boolean(latest.current.pointer);
  latest.current.gesture = raw;
  ```

  Classify `NotAllowedError` and `SecurityError` as `denied`; classify all other startup/inference failures as `unavailable`. Include `attempt` in the effect dependencies. Keep gesture-state-machine callbacks driven only by classified gestures, so ambiguous hands move the magnet but never score an action.

- [ ] **Step 4: Run the focused hook test and adjacent gesture tests**

  Run:
  ```powershell
  npm run test --workspace=@wiggle/web -- --run features/gestures/useHandTracking.test.tsx features/gestures/gestureStateMachine.test.ts
  ```

  Expected: PASS. Existing cleanup and late-model-result tests remain green.

- [ ] **Step 5: Commit the isolated tracking change**

  ```powershell
  git add apps/web/features/gestures/useHandTracking.ts apps/web/features/gestures/useHandTracking.test.tsx
  git commit -m "feat: make hand tracking retryable for magnet lab"
  ```

### Task 2: Define pure Magnet Lab geometry, curriculum progression, and safe gesture semantics

**Files:**
- Create: `apps/web/components/science/magnetHandPlay.ts`
- Create: `apps/web/components/science/magnetHandPlay.test.ts`
- Create: `apps/web/components/science/magnetHandGesture.ts`
- Create: `apps/web/components/science/magnetHandGesture.test.ts`
- Modify: `apps/web/components/science/scienceWorld.ts`

**Interfaces:**
- Consumes `PointerNdc`, `Gesture`, `GESTURE_CONFIG`, and the four `MAGNET_OBJECTS` values.
- Produces:
  ```ts
  export type MagnetCheckpoint = "explore" | "sort" | "hidden";
  export type TablePoint = { x: number; y: number };
  export type MagnetPlayState = {
    checkpoint: MagnetCheckpoint;
    explored: MagnetObjectId[];
    sorted: MagnetObjectId[];
    held: MagnetObjectId | null;
    foundHiddenMagnet: boolean;
  };
  export function handPointerToTable(pointer: PointerNdc): TablePoint;
  export function isWithinMagnetField(magnet: TablePoint, object: TablePoint): boolean;
  export function magnetPlayReducer(state: MagnetPlayState, action: MagnetPlayAction): MagnetPlayState;
  export class MagnetHandGestureController { update(input: MagnetGestureInput): MagnetGestureAction | null; reset(): void; }
  ```
- Consumed by Task 3’s scene and Task 4’s mission shell.

- [ ] **Step 1: Write failing pure tests before introducing JSX**

  Add table mapping cases that clamp NDC to the desk, attraction field cases that include a forgiving edge, and curriculum cases:

  ```ts
  expect(handPointerToTable({ x: 2, y: -2 })).toEqual({ x: 1, y: 0 });
  expect(isWithinMagnetField({ x: .4, y: .5 }, { x: .54, y: .58 })).toBe(true);
  expect(reduce(initialMagnetPlay, { type: "observe", id: "paper-clip" }).explored).toContain("paper-clip");
  expect(reduce(initialMagnetPlay, { type: "observe", id: "wooden-block" }).explored).toContain("wooden-block");
  ```

  Cover: duplicate observation is ignored, all four observed advances `explore → sort`, correct tray advances only after all four, incorrect tray retains the object, only `toolbox` resolves the hidden step, and tracking loss produces no `drop`/`investigate` action.

  For `MagnetHandGestureController`, use explicit timestamps proving pinch acquires once, open palm over a target voluntarily releases, and a 401 ms tracking loss clears a hold without returning a drop.

- [ ] **Step 2: Run the new pure tests to verify they fail**

  Run:
  ```powershell
  npm run test --workspace=@wiggle/web -- --run components/science/magnetHandPlay.test.ts components/science/magnetHandGesture.test.ts
  ```

  Expected: FAIL because the modules do not exist.

- [ ] **Step 3: Implement the minimal immutable state and gesture controller**

  Keep the model independent of React and Three.js. Use one source of truth for the existing object result:

  ```ts
  const result = resultForMagnetObject(action.id);
  const correct = action.target === result;
  ```

  `handPointerToTable` maps mirrored NDC `[-1, 1]` to `[0, 1]`, keeps a 7% table margin, and clamps all positions. The gesture controller only emits `drop` when it sees an actual `open_palm` while `isTracking` is true; its loss timer only clears `held` after `GESTURE_CONFIG.lostHandGraceMs`.

- [ ] **Step 4: Add any needed object metadata without changing results**

  Extend `MagnetObject` in `scienceWorld.ts` with a deterministic tabletop placement and scene model token:

  ```ts
  scenePosition: readonly [number, number];
  sceneKind: "clip" | "nail" | "block" | "button";
  ```

  Preserve the current object ids, names, results, and colors so route and curriculum tests retain their existing contract.

- [ ] **Step 5: Run pure tests and existing science curriculum tests**

  Run:
  ```powershell
  npm run test --workspace=@wiggle/web -- --run components/science/magnetHandPlay.test.ts components/science/magnetHandGesture.test.ts components/science/scienceWorld.test.ts
  ```

  Expected: PASS.

- [ ] **Step 6: Commit the model boundary**

  ```powershell
  git add apps/web/components/science/magnetHandPlay.ts apps/web/components/science/magnetHandPlay.test.ts apps/web/components/science/magnetHandGesture.ts apps/web/components/science/magnetHandGesture.test.ts apps/web/components/science/scienceWorld.ts
  git commit -m "feat: model camera-first magnet interactions"
  ```

### Task 3: Build the compact 3D Magnet Lab workbench

**Files:**
- Create: `apps/web/components/science/MagnetHandLabScene.tsx`
- Create: `apps/web/components/science/MagnetHandLabScene.test.tsx`

**Interfaces:**
- Consumes `HandTrackingLatest`, `MagnetPlayState`, `handPointerToTable`, `isWithinMagnetField`, `MagnetHandGestureController`, and `MAGNET_OBJECTS` scene metadata.
- Produces:
  ```tsx
  export function MagnetHandLabScene(props: {
    latest: React.RefObject<HandTrackingLatest>;
    state: MagnetPlayState;
    reducedMotion: boolean;
    onAction(action: MagnetPlayAction): void;
    onHandStatus(message: string): void;
  }): React.JSX.Element;
  ```
- Consumed by Task 4.

- [ ] **Step 1: Write a scene-shell test with a mocked Canvas**

  Mock `@react-three/fiber` only at the canvas boundary. Verify the scene renders a labelled workbench canvas, accepts all three checkpoint states, and forwards a deterministic observation callback from its pure interaction adapter:

  ```tsx
  render(<MagnetHandLabScene latest={latest} state={exploreState} reducedMotion={false} onAction={onAction} onHandStatus={vi.fn()} />);
  expect(screen.getByLabelText("Magnet Lab workbench")).toBeTruthy();
  ```

- [ ] **Step 2: Run the scene-shell test to verify it fails**

  Run:
  ```powershell
  npm run test --workspace=@wiggle/web -- --run components/science/MagnetHandLabScene.test.tsx
  ```

  Expected: FAIL because `MagnetHandLabScene` does not exist.

- [ ] **Step 3: Implement a real workbench canvas with bounded magnet motion**

  Use a self-contained `<Canvas>` with a warm starry/lab background, a curved workbench, and low-poly object components. In a `useFrame` loop:

  ```ts
  const pointer = props.latest.current.pointer;
  const target = pointer ? handPointerToTable(pointer) : previousTarget.current;
  magnet.position.lerp(new Vector3(tableX(target.x), tableY(target.y), .35), reducedMotion ? 1 : .16);
  ```

  In `explore`, magnetic models move toward/follow the magnet after `isWithinMagnetField`; non-magnetic models stay in their home position and do a brief scale/colour feedback. Dispatch `observe` once per object. In `sort`, place large labelled 3D targets beneath the desk and let the gesture controller dispatch `grab` / voluntary `drop`. In `hidden`, replace the desk objects with a simple campsite tableau and dispatch `investigate` only when the pointer/gesture lands on the toolbox.

  Use refs for per-frame position/animation; only dispatch React actions on first observation, voluntary drop, or investigation. Respect `reducedMotion` by snapping transforms and disabling decorative float/particle loops.

- [ ] **Step 4: Add non-visual alternative text and safe rendering fallbacks**

  Mark the decorative canvas `aria-hidden="true"` and provide a separate `aria-live="polite"` hand-status sentence from the mission shell. Render the scene only after camera `ready`; this avoids treating Canvas/WebGL failure as a camera-permission error. If this canvas throws, surface a dedicated `The lab view needs a graphics-capable device` status plus `Exit Magnet Lab`; do not create a manual learning fallback.

- [ ] **Step 5: Run scene, pure-model, and existing Science canvas tests**

  Run:
  ```powershell
  npm run test --workspace=@wiggle/web -- --run components/science/MagnetHandLabScene.test.tsx components/science/magnetHandPlay.test.ts components/science/magnetHandGesture.test.ts components/science/SciencePlanetCanvas.test.tsx
  ```

  Expected: PASS.

- [ ] **Step 6: Commit the 3D workbench**

  ```powershell
  git add apps/web/components/science/MagnetHandLabScene.tsx apps/web/components/science/MagnetHandLabScene.test.tsx
  git commit -m "feat: render hand-controlled magnet workbench"
  ```

### Task 4: Replace the old button lesson with a camera-first mission shell

**Files:**
- Modify: `apps/web/components/science/MagnetLabMission.tsx`
- Modify: `apps/web/components/science/MagnetLabMission.test.tsx`
- Modify: `apps/web/components/science/magnetLab.module.css`

**Interfaces:**
- Consumes Task 1’s `useHandTracking`, Task 2’s state/gesture controller, and Task 3’s scene.
- Maintains the existing public props:
  ```ts
  export type MagnetLabMissionProps = { onExit(): void; onComplete(): void };
  ```
- Produces the `Magnet Lab mission` region and an automatic `onComplete()` after the hidden magnet is found.

- [ ] **Step 1: Replace tests for the retired button lesson with camera-first tests**

  Remove assertions for `Test …`, `Try the magnet`, `Attracted`, and `Not attracted`. Mock `useHandTracking` at this component boundary and cover:

  ```tsx
  expect(getUserMedia).toHaveBeenCalledTimes(1);
  expect(screen.getByRole("heading", { name: "Ask an adult to turn on the camera" })).toBeTruthy();
  expect(screen.getByRole("button", { name: "Try again" })).toBeTruthy();
  expect(screen.queryByRole("button", { name: /Use hand gestures|Try the magnet/i })).toBeNull();
  ```

  Also test `starting`, ready mission copy, retry, Escape close, focus return to the previously focused start control, and `onComplete` exactly once after a reducer-driven hidden-magnet completion.

- [ ] **Step 2: Run the updated mission test to verify it fails**

  Run:
  ```powershell
  npm run test --workspace=@wiggle/web -- --run components/science/MagnetLabMission.test.tsx
  ```

  Expected: FAIL because the current mission renders manual object and classification buttons.

- [ ] **Step 3: Mount tracking immediately and make failure an adult-assistance state**

  Call `useHandTracking({ enabled: true })` at the mission root. Render its `<video ref={tracking.video} muted playsInline>` from the first render, hidden only visually while startup occurs. Render:

  ```tsx
  if (tracking.status === "denied" || tracking.status === "unavailable") {
    return <section aria-label="Magnet Lab mission" className={styles.adultHelp}>
      <h1>Ask an adult to turn on the camera</h1>
      <p>This magnet activity needs your camera so your hand can guide the magnet.</p>
      <button type="button" onClick={tracking.retry}>Try again</button>
      <button type="button" onClick={onExit}>Back to Science Planet</button>
    </section>;
  }
  ```

  Ensure `Try again` is the only recovery action; `Back to Science Planet` is navigation, not an alternate lesson path.

- [ ] **Step 4: Compose the reference-inspired desktop and mobile layout**

  Build the shell around the real scene: back button at upper left, cream mission/progress card at top centre, friendly guide/bubble at left, `Your Hand` local video card at right, and the 3D workbench as the visual foreground. Use explicit checkpoint copy:

  ```ts
  const copy = {
    explore: "Move your open hand to guide the magnet!",
    sort: "Pinch an object, move it to a tray, then open your hand.",
    hidden: "Point around the campsite to find the hidden magnet.",
  };
  ```

  The progress dots represent `explored.length`, `sorted.length`, or the hidden-magnet discovery. Use `role="status" aria-live="polite"` only for state changes, not the continuously updating hand pointer. Trap focus within the session, close with Escape, restore focus to the previous `Start Magnet Lab` control, and stop camera/model resources by unmounting on exit.

- [ ] **Step 5: Add responsive and reduced-motion CSS**

  In `magnetLab.module.css`, build a desktop three-column overlay grid. Under `48rem`, place the mission card before the workbench and collapse the camera card into a safe-height strip below it. Enforce 44px targets, `max-width: 100%`, `overflow-x: clip`, and no horizontal scrolling. In `prefers-reduced-motion`, remove decorative transforms and scene float effects while keeping magnet positioning immediate and functional.

- [ ] **Step 6: Run mission, hand-hook, and accessibility tests**

  Run:
  ```powershell
  npm run test --workspace=@wiggle/web -- --run components/science/MagnetLabMission.test.tsx features/gestures/useHandTracking.test.tsx tests/accessibility/subject-worlds.test.tsx
  ```

  Expected: PASS. Confirm legacy manual-learning controls are absent.

- [ ] **Step 7: Commit the camera-first shell**

  ```powershell
  git add apps/web/components/science/MagnetLabMission.tsx apps/web/components/science/MagnetLabMission.test.tsx apps/web/components/science/magnetLab.module.css
  git commit -m "feat: make magnet lab camera-first"
  ```

### Task 5: Update browser journeys and complete full verification

**Files:**
- Create: `apps/web/tests/browser/magnet-lab-camera.spec.ts`
- Modify: `apps/web/tests/browser/subject-worlds.spec.ts`
- Modify when needed: `apps/web/tests/browser/helpers.ts`

**Interfaces:**
- Uses existing `launchWiggle`, `enterScience`, `Start Magnet Lab`, and `Magnet Lab mission` selectors.
- Uses browser `getUserMedia` mocks only; it does not require a physical camera or invoke remote hand inference.

- [ ] **Step 1: Replace the manual-completion browser helper with camera-first assertions**

  Delete `completeMagnetLab(page)` and its `Test …`/classification loop from `subject-worlds.spec.ts`. Before entering Magnet Lab in normal, reduced-motion, and forced-WebGL-fallback tests, inject a rejected local camera mock:

  ```ts
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: { getUserMedia: () => Promise.reject(new DOMException("Denied", "NotAllowedError")) },
    });
  });
  ```

  Assert the adult-assistance heading, no `Use hand gestures`/manual lesson controls, and safe `Back to Science Planet` navigation.

- [ ] **Step 2: Add a dedicated browser camera-lifecycle spec**

  Add these Playwright cases. Each injects a rejecting `getUserMedia` mock before `page.goto`, so no physical camera, browser prompt, or remote inference is required:

  ```ts
  test("requests the Magnet Lab camera automatically only after entry", async ({ page }) => {
    await page.addInitScript(() => {
      let calls = 0;
      Object.assign(window, { __magnetCameraCalls: () => calls });
      Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: {
        getUserMedia: () => { calls++; return Promise.reject(new DOMException("Denied", "NotAllowedError")); },
      } });
    });
    await page.goto("/");
    await launchWiggle(page); await enterScience(page);
    expect(await page.evaluate(() => (window as typeof window & { __magnetCameraCalls: () => number }).__magnetCameraCalls())).toBe(0);
    await page.getByRole("button", { name: "Start Magnet Lab", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Ask an adult to turn on the camera" })).toBeVisible();
    expect(await page.evaluate(() => (window as typeof window & { __magnetCameraCalls: () => number }).__magnetCameraCalls())).toBe(1);
  });
  ```

  Add a second test that presses `Try again`, asserts two `getUserMedia` calls and the same safe adult-help UI; add an Escape test that asserts focus returns to `Start Magnet Lab`; and add a mobile test that asserts `document.documentElement.scrollWidth <= innerWidth` while adult help is visible. Verify stream/model cleanup and mocked successful hand-frame completion at the component/hook level, where the local tracker can be deterministically controlled.

- [ ] **Step 3: Run focused desktop and mobile browser tests**

  Start the app on an unused local port, then run:
  ```powershell
  $env:PLAYWRIGHT_EXTERNAL_SERVERS='1'; $env:PLAYWRIGHT_BASE_URL='http://127.0.0.1:3201'
  npx playwright test tests/browser/magnet-lab-camera.spec.ts tests/browser/subject-worlds.spec.ts --project=desktop --project=mobile --reporter=list
  ```

  Expected: PASS for camera denial/retry, focus return, stream cleanup, reduced motion, forced WebGL fallback, desktop, and mobile.

- [ ] **Step 4: Run the full web verification set**

  Run:
  ```powershell
  npm run test --workspace=@wiggle/web
  npm run typecheck --workspace=@wiggle/web
  npm run lint --workspace=@wiggle/web
  npm run build --workspace=@wiggle/web
  ```

  Expected: all commands exit 0.

- [ ] **Step 5: Visually verify and commit test coverage**

  Inspect the local Magnet Lab at a desktop width and a narrow mobile width. Confirm: the large magnet visibly follows a detected hand, metal visibly pulls in, non-magnetic objects remain still, camera card is clear, adult-help state is understandable, and no horizontal overflow exists. Then commit:

  ```powershell
  git add apps/web/tests/browser/magnet-lab-camera.spec.ts apps/web/tests/browser/subject-worlds.spec.ts apps/web/tests/browser/helpers.ts
  git commit -m "test: cover camera-first magnet lab"
  ```

## Plan Self-Review

- Spec coverage: Tasks 1 and 4 implement automatic local-camera startup, exact adult-assistance copy, retry, and cleanup. Tasks 2–4 implement the three approved checkpoint gestures and reference-inspired layout. Task 3 supplies the real 3D workbench. Task 5 verifies desktop/mobile, permission failure/retry, focus, reduced motion, WebGL fallback, and full regression.
- Completeness scan: every task names exact files, interfaces, commands, expected outcomes, and implementation seams.
- Type consistency: Task 1 defines the tracking types consumed by Task 3/4; Task 2 defines the state/action types consumed by Task 3/4; Task 4 preserves the existing `MagnetLabMissionProps` public contract used by `SciencePlanet`.
