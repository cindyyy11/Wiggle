# Wiggle Space Explorer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (inline execution is selected for this task). Steps use checkbox syntax for tracking.

**Goal:** Refine the existing direct Numeria experience into a close-follow, sparse-HUD Wiggle space explorer with rounded procedural space dressing while preserving movement, missions, gesture input, fallbacks, and accessibility.

**Architecture:** Keep `MissionAtlas` as the route/session owner and `UniverseCanvas` as the rendering/input boundary. Extract the exploration overlay into a DOM-only `ExplorationHud` with local open/closed state, then mount a memoized, noninteractive `WiggleSpaceDressings` R3F sibling beside the existing world objects. The existing dirty visual and gesture files remain intact except for minimal, reviewed insertion points.

**Tech Stack:** Next.js/React client components, React Three Fiber, Three.js primitives and instancing, CSS Modules, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-09-12-wiggle-space-explorer-design.md`

## Global Constraints

- Open directly into Numeria; do not reintroduce a hub, preview planets, or travel phases.
- Initialize and restore `MissionAtlas` camera state to `follow`; keep Globe as a visible switch.
- Preserve the exact `UniverseCanvas` callbacks, landmark IDs, pizza/plate/Lexi gesture target refs, event semantics, 2D fallback, and movement controls.
- Keep all new controls ordinary labelled HTML with visible focus, 44px minimum targets, and AA contrast using the Wiggle navy palette.
- Keep R3F animation in `useFrame`/refs; never add per-frame React state updates.
- Use shared procedural geometry/materials and quality-tier reductions; do not add GLTF downloads, shaders, post-processing, or required permissions.
- Preserve the current dirty splash, mission, gesture, logo, and unrelated test changes. Stage only files intentionally changed for this feature when committing.

---

### Task 1: Extract the sparse exploration HUD

**Files:**
- Create: `apps/web/components/universe/ExplorationHud.tsx`
- Create: `apps/web/components/universe/explorationHud.module.css`
- Modify: `apps/web/components/universe/UniverseCanvas.tsx`
- Test: `apps/web/components/universe/UniverseCanvas.test.tsx`

**Interfaces:**
- `ExplorationHudProps` consumes `mode`, `selectedLandmark`, `landmark`, `landmarks`, `mapVisible`, `help`, `setHelp`, `onModeChange`, `onSelectLandmark`, `onMissionStart`, `instructionsId`, and `missionVisible`.
- It produces persistent Follow/Globe controls, a labelled `Mission Constellation` toggle with `aria-expanded`/`aria-controls`, a contextual place prompt, and an accessible destination sheet. It does not own camera, destination, mission, or frame state.

- [ ] **Step 1: Add a focused failing test for default HUD state**

  Extend the existing `UniverseCanvas` test setup with a controlled `mode="follow"` case that asserts `Follow explorer` is pressed, `Globe view` is not, and `Mission Constellation` starts closed. Add a navigator-selection case that clicks `Visit Number Valley`, then asserts the existing `onLandmarkSelect` callback receives `number-valley`.

- [ ] **Step 2: Run the focused test and verify the new assertions fail**

  Run `npm run test --workspace=@wiggle/web -- components/universe/UniverseCanvas.test.tsx -t "Follow|Constellation"`.
  Expected: the new controls are not present or the old destination list does not expose the requested state.

- [ ] **Step 3: Implement the DOM-only HUD**

  Move the view controls, help trigger/panel, destination list, destination card, and related labels into `ExplorationHud`. Keep exact public labels already exercised by tests (`Globe view`, `Follow explorer`, `How to explore`, `Visit ${name}`, `Start fractions mission`, and `Let's explore`). Add a `navigatorOpen` boolean in `UniverseCanvas`, close the sheet after selection, close it on Escape, and force its destination list visible whenever `mapVisible` is true. Use `LANDMARKS` as the only source of destination data.

  The contextual CTA must be truthful: call `onMissionStart` only for `fraction-forest`; other landmarks use the existing `Let's explore` route. `selectLandmark` remains the only selection/routing function.

  Use a warm cream surface, accessible navy text, sage action state, 12–16px card radii, pill-like small controls, and a single soft tinted shadow. Avoid adding a second page or a journal store.

- [ ] **Step 4: Update UniverseCanvas composition and local fallback behavior**

  Change the standalone local mode default from `globe` to `follow`. Render `ExplorationHud` as a DOM sibling of the canvas. Hide exploration context/navigation while `mode === "mission"` or pizza controls are active, but leave the existing pizza controls and mission children mounted. Preserve the existing map fallback, movement pad, zoom, live region, and hand overlay.

- [ ] **Step 5: Run the focused tests and static checks**

  Run `npm run test --workspace=@wiggle/web -- components/universe/UniverseCanvas.test.tsx` and `npm run lint --workspace=@wiggle/web`.
  Expected: focused universe tests pass; no lint errors or hook warnings.

- [ ] **Step 6: Commit only the HUD slice**

  Run `git diff --check`, inspect `git diff --name-only`, then commit only the new HUD files plus the intentional `UniverseCanvas` and test changes with `feat: add sparse Numeria exploration HUD`.

### Task 2: Default the live route to close-follow mode

**Files:**
- Modify: `apps/web/components/mission/MissionAtlas.tsx`
- Test: `apps/web/components/mission/household.test.tsx` or the existing mission component test that mounts `MissionAtlas`

**Interfaces:**
- `MissionAtlas` continues to own `camera`, `destination`, `landmark`, splash, mission, gesture, and event state. Only initial and post-close camera values change.

- [ ] **Step 1: Add a failing route-state assertion**

  Mount `MissionAtlas` with a mocked `UniverseCanvas` and assert the initial `mode` prop is `follow`. Trigger the existing mission-close path and assert the next `mode` is again `follow`.

- [ ] **Step 2: Run the test to confirm current globe behavior fails**

  Run `npm run test --workspace=@wiggle/web -- components/mission/household.test.tsx -t "follow"` (or the closest existing `MissionAtlas` test file if the household suite is the owner).
  Expected: the initial and close values are currently `globe`.

- [ ] **Step 3: Change only the two controlled camera values**

  Change `useState<CameraMode>("globe")` to `useState<CameraMode>("follow")` and change the non-complete `close()` reset from `setCamera("globe")` to `setCamera("follow")`. Do not touch splash timing, gesture refs, pizza targets, API events, or mission completion behavior.

- [ ] **Step 4: Run mission-focused tests**

  Run `npm run test --workspace=@wiggle/web -- components/mission/household.test.tsx apps/web/tests/mission/completion.test.tsx` with the repository's normal test runner syntax.
  Expected: camera assertions pass and completion/event tests retain their existing results.

- [ ] **Step 5: Commit only the camera-owner change**

  Commit the intentional `MissionAtlas` and test changes with `fix: enter Numeria in follow camera`.

### Task 3: Add isolated Wiggle space dressing

**Files:**
- Create: `apps/web/components/universe/spacePalette.ts`
- Create: `apps/web/components/universe/WiggleSpaceDressings.tsx`
- Modify: `apps/web/components/universe/UniverseScene.tsx`
- Test: `apps/web/components/universe/UniverseScene.test.tsx` if present, otherwise add a focused render-prop assertion beside the existing universe tests

**Interfaces:**
- `WiggleSpaceDressings({ quality, reducedMotion }: { quality: "high" | "low"; reducedMotion: boolean })` renders decorative, noninteractive R3F content and no input handlers.
- `spacePalette` exports the logo-tied cream, pale blue, navy, sage, coral, and mustard constants used by the new meshes.

- [ ] **Step 1: Add a deterministic component test or scene mock assertion**

  Mock the new component in the scene test and assert it receives the current `quality` tier and `reducedMotion` flag, and that it is rendered once beside `Numeria`. If the repository has no scene unit harness, add a small exported pure `decorationCounts(quality)` helper test: low quality returns fewer stars/clouds than high quality and both retain a positive core count.

- [ ] **Step 2: Run the new focused test and confirm it fails**

  Run `npm run test --workspace=@wiggle/web -- components/universe/UniverseScene.test.tsx` (or the new helper test path).
  Expected: the dressing module/import does not yet exist.

- [ ] **Step 3: Implement shared palette and memoized decorations**

  Build the component from Three.js spheres, capsules, tori, small faceted rocks, and a soft atmosphere shell. Keep repeated objects in memoized arrays or instanced meshes. Add a reduced cloud/star/orbit count in low quality. Use a `useFrame` loop only for a restrained group rotation/bob when `reducedMotion` is false; do not set React state.

  Keep decorations away from the mission pedestal and existing interactive meshes. Do not modify `Landmarks.tsx` target refs, IDs, or parent hierarchy. Do not add pointer/click handlers to the new meshes.

- [ ] **Step 4: Mount the dressing at the existing scene boundary**

  Add `WiggleSpaceDressings` once in `UniverseScene` beside `OrbitingWorlds`/`SpaceStars`, passing the current quality and reduced-motion values. Keep `CameraRig`, `GestureInteractionLayer`, `Landmarks`, and `Numeria` props unchanged.

- [ ] **Step 5: Run focused tests, lint, and typecheck**

  Run `npm run test --workspace=@wiggle/web -- components/universe`, `npm run lint --workspace=@wiggle/web`, and `npm run typecheck --workspace=@wiggle/web`.
  Expected: all universe tests pass, no invalid Three.js props, and no new per-frame React work.

- [ ] **Step 6: Commit only the isolated dressing slice**

  Commit `spacePalette.ts`, `WiggleSpaceDressings.tsx`, the minimal `UniverseScene.tsx` insertion, and their test with `feat: add rounded Wiggle space dressing`.

### Task 4: Browser QA and final verification

**Files:**
- Modify: `apps/web/tests/browser/universe.spec.ts` only where the existing splash helper or old destination selectors require the new HUD labels
- Create: `.impeccable/review/desktop.png`, `.impeccable/review/mobile.png` as local QA captures if the browser harness supports them

- [ ] **Step 1: Run the focused regression suite**

  Run:

  ```powershell
  npm run test --workspace=@wiggle/web -- components/universe/UniverseCanvas.test.tsx components/universe/cameraMotion.test.ts
  npm run test --workspace=@wiggle/web -- tests/mission/completion.test.tsx
  npm run lint --workspace=@wiggle/web
  npm run typecheck --workspace=@wiggle/web
  ```

  Expected: all commands pass. Do not weaken tests for the existing fallback, camera math, gesture, or completion contracts.

- [ ] **Step 2: Run desktop and mobile browser checks**

  Use the existing Playwright setup after the known route build prerequisite. Verify splash activation, close-follow entry, Globe/Follow switching, constellation selection, click-to-walk, WASD/Shift/Space, 2D fallback, mission entry, pizza controls, context-loss recovery, and 390 × 844 layout without overlap.

- [ ] **Step 3: Run the Impeccable detector once**

  Run `node C:\Users\User\.agents\skills\impeccable\scripts\detect.mjs --json apps/web/components/universe/ExplorationHud.tsx apps/web/components/universe/explorationHud.module.css apps/web/components/universe/WiggleSpaceDressings.tsx apps/web/components/universe/spacePalette.ts apps/web/components/universe/UniverseCanvas.tsx apps/web/components/universe/UniverseScene.tsx apps/web/components/mission/MissionAtlas.tsx`.
  Fix mechanical findings that apply to the changed UI, then rerun the focused checks once. Do not run a second detector.

- [ ] **Step 4: Inspect one desktop and one mobile render**

  Confirm the canvas remains the first-read surface, controls have AA contrast and 44px targets, the contextual card does not cover mission geometry, reduced motion removes decorative movement, and no dark-dashboard styling or hub UI has returned.

- [ ] **Step 5: Final diff safety check**

  Run `git status --short`, `git diff --check`, and `git diff --stat`. Confirm unrelated existing dirty files, including `.worktrees/playful-brand`, splash/logo assets, concurrent gesture files, and the mission completion test, were not overwritten or staged accidentally.

