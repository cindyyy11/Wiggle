# Wiggle Solar-System Vertical Slice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a branded Wiggle opening and miniature solar-system hub that leads into the existing adaptive Numeria fraction mission without breaking its fallbacks or accessibility.

**Architecture:** Keep `MissionAtlas` as the session/adaptation/event boundary and wrap it with a new `WiggleExperience` phase shell. A small Zustand store holds declarative world UI state; procedural R3F scenes own frame-level motion; Framer Motion owns DOM overlay transitions. Numeria remains the high-detail active world and all other destinations are low-detail previews.

**Tech Stack:** Next.js 15, React 19, TypeScript, React Three Fiber, Three.js, Drei, Zustand, Framer Motion, CSS Modules, Vitest, Testing Library, Playwright.

**Spec:** `docs/superpowers/specs/2026-09-12-wiggle-solar-system-vertical-slice-design.md`

## Global Constraints

- Preserve the working `MissionAtlas` adaptive learning loop, API queue, event taxonomy, parent route, WebGL fallback, and 2D mission fallback.
- The child-facing interface must not expose learner friction scores, simulation rankings, or Digital Twin terms.
- Every pointer action has keyboard and touch alternatives; gesture input is optional and never required.
- Use the supplied logo palette and original Wiggle copy, geometry, and components; do not copy Little Planet assets, layout, source code, or text.
- Reduced motion removes camera flights and decorative movement without hiding state changes.
- Audio is opt-in and muted by default.
- Distant planets use primitives/instancing and sparse stars; no new model downloads are required.
- Keep existing minimum 44px touch targets, focus rings, live status text, and readable contrast.

## Planned File Structure

```text
apps/web/
  app/
    page.tsx                         # mounts WiggleExperience
    layout.tsx                       # metadata/icon remains branded
  components/wiggle/
    WiggleExperience.tsx             # opening, hub, preview, Numeria phases
    wiggle.module.css                # cream/cosmic shell and responsive HUD
    OpeningMoment.tsx                # logo, greeting, single entry action
    SolarSystemHub.tsx               # planet cards, travel state, Space Log button
    SpaceLog.tsx                     # J shortcut, wonders and constellation labels
    LexiCompanion.tsx                # world companion speech and captions
    worldStore.ts                    # Zustand state and versioned browser persistence
    worlds.ts                        # configuration-driven planet/wonder metadata
    solarSystemScene.tsx             # procedural R3F hub and low-detail previews
    solarSystemMotion.ts             # reduced-motion-safe travel interpolation
  components/universe/
    UniverseCanvas.tsx               # preserve Numeria boundary; accept branded shell props
    ...                              # existing movement/camera/landmark components
  components/mission/
    MissionAtlas.tsx                 # preserve API/session ownership; wire new shift callbacks
    PizzaActivity.tsx                # accessible pizza/slice interaction model
    FractionPizza.tsx                # draggable 3D/DOM hybrid presentation
    StuckMode.tsx                    # one-next-action Wiggle Shift surface
    mission.module.css               # replace child-facing analytics presentation
  public/brand/
    wiggle-mark.png                  # cropped supplied character mark
  tests/wiggle/
    experience.test.tsx
    worldStore.test.ts
    space-log.test.tsx
  tests/browser/wiggle.spec.ts       # opening, hub, travel, journal smoke flow
```

### Task 1: Add the visual/runtime dependencies and configuration data

**Files:**
- Modify: `apps/web/package.json`, root `package-lock.json`
- Create: `apps/web/components/wiggle/worlds.ts`
- Create: `apps/web/components/wiggle/worldStore.ts`
- Create: `apps/web/components/wiggle/worldStore.test.ts`

**Interfaces:**
- `worlds.ts` exports `PlanetId`, `PlanetDefinition`, `WonderDefinition`, `PLANETS`, and `WONDERS`.
- `worldStore.ts` exports `WorldPhase = "opening" | "hub" | "preview" | "numeria"`, `WorldState`, and `useWorldStore`.
- `selectPlanet(id: PlanetId)`, `enterNumeria()`, `recordWonder(id: string)`, `toggleSpaceLog()`, and `setReducedMotion(value: boolean)` are stable store actions.

- [ ] **Step 1: Add the two required UI dependencies.**

Run: `npm install --workspace=@wiggle/web framer-motion zustand`

Expected: `apps/web/package.json` and `package-lock.json` contain the resolved dependencies without removing existing packages.

- [ ] **Step 2: Define configuration-driven planet and wonder metadata.**

Use five planet records with IDs `numeria`, `lexicon`, `novalab`, `reset-moon`, and `constellation`; include label, subject, palette, orbital position, preview copy, and `playable` boolean. Define at least seven wonder records and mark `forest-firefly` as the first Numeria discovery.

- [ ] **Step 3: Implement the persisted declarative world store.**

Persist only phase-independent cosmetic state under `wiggle-world-v1` in `localStorage`; guard browser storage access for SSR/tests. Do not store per-frame positions or API session objects.

- [ ] **Step 4: Write store tests and run them.**

Run: `npm run test --workspace=@wiggle/web -- worldStore.test.ts`

Expected: tests verify the initial opening phase, selecting a preview planet, entering Numeria, recording an idempotent wonder, toggling the Space Log, and safe operation when storage is unavailable.

### Task 2: Build the branded opening and experience shell

**Files:**
- Create: `apps/web/components/wiggle/WiggleExperience.tsx`
- Create: `apps/web/components/wiggle/OpeningMoment.tsx`
- Create: `apps/web/components/wiggle/wiggle.module.css`
- Modify: `apps/web/app/page.tsx`
- Modify: `apps/web/app/layout.tsx`
- Create: `apps/web/public/brand/wiggle-mark.png`

**Interfaces:**
- `WiggleExperience` accepts the existing `MissionAtlas` quality/client/child props and renders the current mission only when the store phase is `numeria`.
- `OpeningMoment` accepts `onEnter(): void` and renders one primary button labelled `Let’s Wiggle`.

- [ ] **Step 1: Produce the public logo crop from the supplied source.**

Use the inspected `C:/Users/User/Downloads/Wiggle Logo.jpeg` source to create `apps/web/public/brand/wiggle-mark.png` with a warm-cream transparent/solid treatment and enough resolution for a 2x header mark. Preserve the existing working-tree `wiggle-mark.png` and `wiggle-full.jpeg` edits if they are the current user's brand treatment; do not modify the source file or overwrite those changes without comparing them first.

- [ ] **Step 2: Implement the opening phase.**

Render the logo with meaningful alt text, the tagline, Lexi's greeting “Hey Maya! Ready to explore?”, and exactly one primary entry action. Use Framer Motion for opacity/scale only, and make the reduced-motion branch immediate.

- [ ] **Step 3: Mount the shell from the app route.**

Replace the direct `MissionAtlas` render in `apps/web/app/page.tsx` with `WiggleExperience`, forwarding the same child/session/fallback props. Migrate the existing uncommitted `MissionAtlas` splash only after preserving its logo and copy intent; do not overwrite unrelated user edits. Keep the existing authenticated household branch unchanged.

- [ ] **Step 4: Add responsive branded CSS and metadata checks.**

Keep `44px` targets, visible focus outlines, cream/blue/coral/sage/mustard tokens, and mobile layout support. Ensure `layout.tsx` points to `/brand/wiggle-mark.png` or the generated icon without changing the page title/description.

- [ ] **Step 5: Add shell component tests.**

Test that the opening has one entry action, the action changes the phase to hub, the logo has alt text, and reduced-motion mode does not require animation completion.

### Task 3: Implement the solar-system hub and travel previews

**Files:**
- Create: `apps/web/components/wiggle/SolarSystemHub.tsx`
- Create: `apps/web/components/wiggle/solarSystemScene.tsx`
- Create: `apps/web/components/wiggle/solarSystemMotion.ts`
- Modify: `apps/web/components/wiggle/WiggleExperience.tsx`
- Create: `apps/web/components/wiggle/solarSystemScene.test.tsx`

**Interfaces:**
- `SolarSystemHub` accepts `onEnterNumeria(): void` and renders `PLANETS` from configuration.
- `SolarSystemScene` accepts `{ selected: PlanetId; reducedMotion: boolean; onSelect(id: PlanetId): void }` and renders procedural planets/orbits.
- `travelProgress(from: PlanetId, to: PlanetId, elapsedMs: number, reducedMotion: boolean): number` returns a clamped 0–1 progress value.

- [ ] **Step 1: Implement deterministic travel interpolation tests.**

Cover clamping, a 2–4 second normal travel duration, and immediate completion when reduced motion is enabled.

- [ ] **Step 2: Build the procedural hub scene.**

Use low-detail spheres/icosahedra, curved orbit lines, a capped star field, shared matte materials, and one Lexi companion anchor. Make planet meshes keyboard-focusable through the adjacent DOM destination controls rather than relying on canvas semantics.

- [ ] **Step 3: Add destination controls and preview cards.**

Selecting a planet updates the store and card copy. Numeria uses `Enter Numeria`; other planets use `Growing soon` while remaining selectable and visually distinct. Add `My Space Log` with an accessible `J` shortcut hint.

- [ ] **Step 4: Wire travel and Numeria entry.**

Use a Framer Motion overlay for the short camera/travel transition, then switch to the Numeria phase. Do not keep multiple detailed worlds mounted.

- [ ] **Step 5: Verify hub tests.**

Run: `npm run test --workspace=@wiggle/web -- solarSystemScene.test.tsx`

Expected: selecting all five destinations updates the destination card; only Numeria exposes the enter action; reduced motion skips the delay.

### Task 4: Add Lexi, Space Log, and discovery feedback

**Files:**
- Create: `apps/web/components/wiggle/LexiCompanion.tsx`
- Create: `apps/web/components/wiggle/SpaceLog.tsx`
- Create: `apps/web/components/wiggle/space-log.test.tsx`
- Modify: `apps/web/components/wiggle/WiggleExperience.tsx`
- Modify: `apps/web/components/universe/UniverseCanvas.tsx`
- Modify: `apps/web/components/universe/UniverseScene.tsx`

**Interfaces:**
- `LexiCompanion` accepts `{ message: string; nearLandmark?: boolean; reducedMotion: boolean }` and exposes the same message as visible caption text.
- `SpaceLog` accepts `{ open: boolean; onClose(): void }` and renders discovered wonders, planets, and constellation labels.

- [ ] **Step 1: Add the world Lexi companion.**

Create a small original rounded R3F companion with expressive eyes, mustard antenna, gentle bobbing, and a DOM caption bubble. Near Fraction Forest it uses “Want to explore fractions?”; otherwise it uses “Something interesting is over there!”.

- [ ] **Step 2: Add the Space Log panel and shortcut.**

Open with `J`, close with Escape or a labelled close control, trap focus while open, and render “Wiggle Wonders” plus positive constellation labels such as “Visual Explorer” and “Tiny-Step Starter”.

- [ ] **Step 3: Add first-discovery feedback.**

On mission completion, call `recordWonder("forest-firefly")`, show one calm star sparkle and a live status message, and avoid repeated celebration for an already recorded wonder.

- [ ] **Step 4: Extend Numeria without breaking its renderer boundary.**

Pass the Lexi/discovery callbacks into existing Numeria scene props while keeping `GraphicsBoundary`, quality detection, 2D fallback, camera controls, and existing input refs intact.

- [ ] **Step 5: Test keyboard and persistence behaviour.**

Cover J/Escape opening, focusable close, live caption text, one-time wonder recording, and storage reload.

### Task 5: Replace the child-facing fraction surface with tactile pizza and Wiggle Shift

**Files:**
- Create: `apps/web/components/mission/FractionPizza.tsx`
- Modify: `apps/web/components/mission/PizzaActivity.tsx`
- Modify: `apps/web/components/mission/StuckMode.tsx`
- Modify: `apps/web/components/mission/FractionMission.tsx`
- Modify: `apps/web/components/mission/MissionAtlas.tsx`
- Modify: `apps/web/components/mission/mission.module.css`
- Modify: `apps/web/tests/mission/hero-loop.test.tsx`

**Interfaces:**
- `FractionPizza` accepts `{ selectedSlices: readonly number[]; onToggleSlice(index: number, input?: CompletionInput): void; simplified: boolean }` and exposes each slice as a labelled draggable/toggleable control.
- `StuckMode` accepts `{ selectedSlices; onCheck; onOneNextAction }` and never renders prediction percentages or strategy choices.

- [ ] **Step 1: Add the visual pizza and drag contract.**

Render four equal slices with a plate target. Pointer/touch drag to the plate selects a slice; clicking a slice toggles it; keyboard buttons labelled `Slice 1` through `Slice 4` call the same callback. Keep the current `selectedSlices` source of truth so events and gesture commands remain compatible.

- [ ] **Step 2: Replace analytics UI in the child mission.**

Remove `SimulationHologram` from the child-facing path. Keep `simulate`/`select` calls available for backend measurement, but select the authored visual gesture strategy internally when Wiggle Shift starts.

- [ ] **Step 3: Implement the simplified state.**

Wiggle Shift fades nonessential scenery via a CSS class, moves the mission camera closer through the existing mode path, renders Lexi's “Let’s try it another way ✨”, and shows exactly “Just move one slice first.” until the first slice is selected.

- [ ] **Step 4: Preserve completion/event semantics.**

Keep `mission_completed`, `stuck_requested`, mode, objective, input method, and API queue behaviour unchanged. A correct result remains three of four slices and awards the existing Wiggle Energy value.

- [ ] **Step 5: Update mission tests.**

Assert that stuck mode has no prediction test IDs or strategy controls, has one next action, supports click/touch/keyboard equivalents, and still produces the existing completion payload and queued event types.

### Task 6: Integrate responsive audio/preferences and verify the full journey

**Files:**
- Modify: `apps/web/components/wiggle/WiggleExperience.tsx`
- Modify: `apps/web/components/wiggle/wiggle.module.css`
- Modify: `apps/web/tests/browser/universe.spec.ts`
- Create: `apps/web/tests/browser/wiggle.spec.ts`
- Modify: `apps/web/tests/accessibility/input-equivalence.test.tsx`

**Interfaces:**
- `WiggleExperience` exposes mute and reduced-motion controls with semantic labels and uses no autoplay.
- Browser flow remains runnable with WebGL disabled/fallback and at a 390 × 844 viewport.

- [ ] **Step 1: Add muted-by-default audio preference.**

Use a user-initiated audio toggle only; wire success/hover/step cues behind that preference and keep all learning state independent of audio availability.

- [ ] **Step 2: Finish mobile and fallback layout.**

At 390 × 844 keep planet controls, journal, Lexi captions, pizza actions, and close controls within the viewport. Preserve the current 2D Numeria map and movement-pad layout when WebGL is unavailable.

- [ ] **Step 3: Add the end-to-end browser journey.**

Cover opening → hub → Numeria → Fraction Forest → stuck shift → three slices → success → Space Log → selecting another preview planet. Use accessible roles/names rather than canvas coordinates for all DOM assertions.

- [ ] **Step 4: Run focused tests.**

Run: `npm run test --workspace=@wiggle/web`; `npm run test:e2e --workspace=@wiggle/web`; `npm run lint --workspace=@wiggle/web`; `npm run typecheck --workspace=@wiggle/web`.

Expected: all existing and new tests pass, including camera/movement, mission, accessibility, fallback, and browser suites.

- [ ] **Step 5: Run production verification.**

Run: `npm run build --workspace=@wiggle/web`

Expected: Next production build completes without missing asset, client/server boundary, or hydration errors.

### Task 7: Visual QA and handoff

**Files:**
- Modify: `design-qa.md`
- Modify: `README.md` only if the local run instructions or new shortcut list changes

- [ ] **Step 1: Capture desktop and mobile screenshots.**

Check opening, hub, Numeria, stuck shift, pizza completion, fallback, and Space Log at desktop and 390 × 844.

- [ ] **Step 2: Review performance and reduced motion.**

Confirm distant planets stay low-detail, the active world is the only detailed scene, reduced motion skips flights/bobbing, and WebGL loss returns to the 2D path.

- [ ] **Step 3: Record QA findings.**

Document verified flows and any intentionally deferred preview-world behaviour in `design-qa.md` without adding unrelated refactors.

- [ ] **Step 4: Commit the implementation in reviewable slices.**

Use focused commits for store/data, shell/hub, mission interaction, and verification so each change can be reviewed independently.

## User-direction addendum — retain direct Little-Planet-style exploration

The user clarified that the existing spherical exploration experience is the product interaction to preserve. The opening and solar-system hub introduced in Tasks 1–3 are not a desired replacement flow and must be removed. The final experience must enter the current `MissionAtlas` / `UniverseCanvas` world directly, retaining its avatar movement, click-to-walk, camera modes, landmarks, mission route, keyboard/touch controls, WebGL fallback, and adaptive-learning behavior. Only the visual language should change to an original Wiggle-branded, child-safe space aesthetic.

Tasks 1–3 are historical implementation work and are superseded by Task 8. Tasks 4–7 must not be started; their hub, journal, companion, and mission-behavior additions exceed the user's style-only request.

### Task 8: Remove the hub-first replacement flow

**Files:**
- Modify: `apps/web/app/page.tsx`, `apps/web/tests/mission/household.test.tsx`, `apps/web/package.json`, `package-lock.json`
- Delete: only the files created by the superseded hub work under `apps/web/components/wiggle/`, `apps/web/tests/wiggle/`, and `apps/web/tests/browser/wiggle-hub.spec.ts`
- Preserve without modification: user-owned `MissionAtlas.tsx`, `mission.module.css`, `apps/web/public/brand/wiggle-mark.png`, `apps/web/public/brand/wiggle-full.jpeg`, `.worktrees/playful-brand`, and unrelated gesture work/docs.

**Interfaces:**
- `HomePage` must again mount `MissionAtlas` directly in both local fallback and selected-child paths, forwarding the identical props used before the replacement flow.
- No public runtime import may reference `WiggleExperience`, `SolarSystemHub`, `OpeningMoment`, the solar-scene modules, Zustand, or Framer Motion.

- [ ] **Step 1: Restore direct mission entry.**

Restore the original `MissionAtlas` imports and direct render path in `apps/web/app/page.tsx`; restore its targeted household mock accordingly. Do not modify the implementation of `MissionAtlas` itself.

- [ ] **Step 2: Remove the obsolete hub-only files and dependencies.**

Delete only the newly added `components/wiggle` and Wiggle hub test files listed above. Remove `framer-motion` and `zustand` from the web package and lockfile only after confirming no remaining import uses them. Keep the branded favicon change unless it is required by a deleted import.

- [ ] **Step 3: Verify restoration.**

Run the focused household and universe/camera tests, typecheck, lint, and a production build. Confirm that `rg` finds no runtime hub imports and that unrelated dirty files remain unstaged.

### Task 9: Restyle the retained exploration world only

**Files:**
- Modify only as needed: `apps/web/components/universe/UniverseCanvas.tsx`, `UniverseScene.tsx`, `Numeria.tsx`, `OrbitingWorlds.tsx`, `Astronaut.tsx`, `Landmarks.tsx`, and `universe.module.css`
- Add or update existing universe tests only if the visual markup needs an accessible assertion.
- Do not modify `MissionAtlas.tsx`, `mission.module.css`, app routing, learning activity flow, camera/input modules, API code, or user-owned brand files.

**Interfaces:**
- Preserve the public props/exports of all universe components and all input/camera event contracts.
- Preserve direct world initialization, click-to-walk, WASD/arrow/shift/space support, globe/follow/mission camera modes, landmarks, fallback rendering, and test IDs/accessible names.

- [ ] **Step 1: Apply Wiggle's original space visual system.**

Use the supplied logo as palette/reference only: warm cream and pale blue atmosphere, friendly navy type, sage/coral/mustard accents, rounded clay-like primitives, and sparse gentle stars. Do not copy Little Planet's assets, markup, copy, layout, or source code; retain only the existing interaction model.

- [ ] **Step 2: Preserve 3D model behavior.**

Change materials, lighting, terrain treatment, silhouettes, and HUD styling without changing world geometry ownership, pointer/keyboard interaction paths, or camera physics. Existing procedural astronaut, planet, and landmark models remain functional R3F content.

- [ ] **Step 3: Verify visual-only scope.**

Run existing universe/camera/mission tests, keyboard/fallback browser smoke coverage, lint, typecheck, production build, and the Impeccable visual detector. Review the diff to confirm no interaction, route, adaptive-learning, or user-owned-file behavior changed.

### Task 10: Resolve the normal-exploration HUD collision

**Files:**
- Modify only: `apps/web/components/mission/mission.module.css`

**Interfaces:**
- Preserve the existing `Mission Atlas progress` markup, active-mission placement, all controls, and every learning-state behavior.

- [ ] **Step 1: Move only the normal-exploration progress readout at affected desktop/tablet breakpoints.**

Use a scoped `.atlas:not(.active) .atlasHud` rule to move the progress block into a clear upper-right slot for widths above the mobile breakpoint. Do not change the active mission HUD, the splash, destination list, or movement controls.

- [ ] **Step 2: Verify no overlap regression.**

Check desktop, 901–1100px tablet, and 390px mobile placement; run the focused universe and household tests and inspect the CSS diff for layout-only changes.
