# Numeria Science-Style Learning Experience Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Science-style Numeria planet flow with four colorful, selectable regions and a complete Maths mini-activity for every region.

**Architecture:** Add a Maths-specific planet controller that uses the existing Numeria `UniverseCanvas`, owns selection/session/completion state, and renders a Maths HUD matching the Science interaction hierarchy. Keep activity content data-driven behind one reusable session component, and extract the existing Science focus-trapping frame into a subject-neutral component without changing Science behavior.

**Tech Stack:** Next.js 15, React 19, TypeScript, React Three Fiber, CSS Modules, Lucide React, Vitest, Testing Library

**Spec:** `docs/plans/2026-09-19-numeria-science-style-design.md`

## Global Constraints

- Numeria remains playable; English and Bahasa Melayu remain unavailable and retain centered lock icons.
- Use the project's Lucide icon library for interface icons; do not introduce UI emoji.
- Each region must be recognizable through both color and form, not color alone.
- Keep motion calm and localized and respect `prefers-reduced-motion`.
- Every action must be keyboard accessible with visible focus styling.
- Disabled controls must use the semantic `disabled` attribute.
- Incorrect answers never end an activity and must allow another attempt.
- Do not add backend persistence, accounts, leaderboards, or a general content-authoring system.

---

## File Structure

- Create `apps/web/components/planet/ActivitySessionFrame.tsx`: shared dialog/focus frame used by Science and Maths.
- Modify `apps/web/components/science/ScienceSessionFrame.tsx`: compatibility wrapper around the shared frame.
- Create `apps/web/components/math/mathActivities.ts`: Numeria region metadata, challenge data, and answer helpers.
- Create `apps/web/components/math/mathActivities.test.ts`: pure content and scoring tests.
- Create `apps/web/components/math/MathHud.tsx`: Science-style topic controls and selected-region card.
- Create `apps/web/components/math/MathHud.test.tsx`: selection and Explore behavior tests.
- Create `apps/web/components/math/MathActivitySession.tsx`: reusable three-challenge activity surface.
- Create `apps/web/components/math/MathActivitySession.module.css`: activity visuals, region variants, feedback, and reduced motion.
- Create `apps/web/components/math/MathActivitySession.test.tsx`: answer, retry, completion, and accessibility tests.
- Create `apps/web/components/math/MathPlanet.tsx`: public Numeria wrapper.
- Create `apps/web/components/math/MathPlanetCanvas.tsx`: planet selection, camera, session, and completion orchestration.
- Create `apps/web/components/math/MathPlanetCanvas.test.tsx`: end-to-end component interaction tests with a mocked universe.
- Create `apps/web/components/math/mathPlanet.module.css`: Numeria HUD/camera layout matching Science.
- Modify `apps/web/components/worlds/SubjectWorlds.tsx`: render `MathPlanet` for the Maths route.
- Modify `apps/web/components/worlds/SubjectWorlds.test.tsx`: update route mock and verify session navigation blocking.
- Modify `apps/web/components/universe/ExplorationHud.tsx`: exclude Lexi's beacon from learner destination navigation.
- Modify `apps/web/components/universe/ExplorationHud.test.tsx`: verify only four Maths learning regions are listed.

---

### Task 1: Extract the shared activity-session frame

**Files:**
- Create: `apps/web/components/planet/ActivitySessionFrame.tsx`
- Modify: `apps/web/components/science/ScienceSessionFrame.tsx`
- Test: `apps/web/components/science/SciencePlanetCanvas.test.tsx`

**Interfaces:**
- Produces: `ActivitySessionFrame({ open, name, onClose, children }: ActivitySessionFrameProps)`.
- Preserves: `ScienceSessionFrame` with its existing prop signature.

- [ ] **Step 1: Strengthen the existing Science focus-frame test**

Add a regression case to `SciencePlanetCanvas.test.tsx` that opens a starter session, asserts `role="dialog"` and `aria-label="Animal Types activity session"`, presses Escape, and asserts the dialog closes.

```tsx
fireEvent.click(screen.getByRole('button', { name: 'Visit Animal Types' }));
fireEvent.click(screen.getByRole('button', { name: 'Explore Animal Types' }));
expect(screen.getByRole('dialog', { name: 'Animal Types activity session' })).toBeTruthy();
fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
expect(screen.queryByRole('dialog')).toBeNull();
```

- [ ] **Step 2: Run the focused test before refactoring**

Run: `npm test --workspace=@wiggle/web -- SciencePlanetCanvas.test.tsx`

Expected: PASS, establishing the behavior that must be preserved.

- [ ] **Step 3: Move the frame implementation to the shared component**

Create `ActivitySessionFrame.tsx` with the current `ScienceSessionFrame` focus trap, Escape handling, dialog attributes, focus restoration, and `[data-session-controls]` boundary. Export the props type:

```tsx
export type ActivitySessionFrameProps = {
  open: boolean;
  name: string;
  onClose: () => void;
  children: ReactNode;
};
```

Change `ScienceSessionFrame.tsx` to a compatibility export:

```tsx
export { ActivitySessionFrame as ScienceSessionFrame } from '../planet/ActivitySessionFrame';
```

- [ ] **Step 4: Run the Science tests**

Run: `npm test --workspace=@wiggle/web -- SciencePlanetCanvas.test.tsx`

Expected: PASS with identical Science dialog and Escape behavior.

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/planet/ActivitySessionFrame.tsx apps/web/components/science/ScienceSessionFrame.tsx apps/web/components/science/SciencePlanetCanvas.test.tsx
git commit -m "refactor: share planet activity session frame"
```

---

### Task 2: Define the four Numeria activities

**Files:**
- Create: `apps/web/components/math/mathActivities.ts`
- Create: `apps/web/components/math/mathActivities.test.ts`

**Interfaces:**
- Produces: `MathRegionId = Exclude<LandmarkId, 'lexi'>`.
- Produces: `MathChallenge`, `MathActivity`, `MATH_ACTIVITIES`, `mathActivity(id)`, and `isCorrectMathAnswer(challenge, answer)`.
- Consumes: `LandmarkId` and `LANDMARKS` from `components/universe/world.ts`.

- [ ] **Step 1: Write failing data-contract tests**

Test that the record has exactly the four region IDs, every activity has three challenges, each challenge has exactly one valid answer among its options, and unknown IDs are rejected.

```ts
expect(Object.keys(MATH_ACTIVITIES)).toEqual([
  'fraction-forest', 'number-valley', 'geometry-ridge', 'crystal-crater',
]);
for (const activity of Object.values(MATH_ACTIVITIES)) {
  expect(activity.challenges).toHaveLength(3);
  for (const challenge of activity.challenges) {
    expect(challenge.options.filter(option => option === challenge.answer)).toHaveLength(1);
  }
}
```

- [ ] **Step 2: Run the data test to verify it fails**

Run: `npm test --workspace=@wiggle/web -- mathActivities.test.ts`

Expected: FAIL because `mathActivities.ts` does not exist.

- [ ] **Step 3: Implement typed activity data**

Use this shape:

```ts
export type MathRegionId = 'fraction-forest' | 'number-valley' | 'geometry-ridge' | 'crystal-crater';
export type MathVisual =
  | { kind: 'fraction'; filled: number; total: number }
  | { kind: 'sequence'; values: readonly (number | null)[] }
  | { kind: 'shape'; shape: 'triangle' | 'square' | 'hexagon' }
  | { kind: 'crystals'; left: number; operator: '+' | '-'; right: number };
export type MathChallenge = {
  id: string;
  prompt: string;
  hint: string;
  visual: MathVisual;
  options: readonly string[];
  answer: string;
};
export type MathActivity = {
  id: MathRegionId;
  name: string;
  subtitle: string;
  instruction: string;
  color: string;
  challenges: readonly MathChallenge[];
};
```

Create three age-appropriate challenges per activity: fraction recognition/comparison, missing-number patterns, sides/corners shape recognition, and one-digit addition/subtraction. Derive names, subtitles, and colors from the corresponding `LANDMARKS` entries to prevent presentation drift.

- [ ] **Step 4: Run the data tests**

Run: `npm test --workspace=@wiggle/web -- mathActivities.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/math/mathActivities.ts apps/web/components/math/mathActivities.test.ts
git commit -m "feat: define Numeria learning activities"
```

---

### Task 3: Build the Science-style Maths HUD

**Files:**
- Create: `apps/web/components/math/MathHud.tsx`
- Create: `apps/web/components/math/MathHud.test.tsx`
- Create: `apps/web/components/math/mathPlanet.module.css`

**Interfaces:**
- Consumes: `MathRegionId`, `MATH_ACTIVITIES`.
- Produces: `MathHud({ selectedRegion, completedRegions, onRegionSelect, onExplore, onBackToWorlds })`.

- [ ] **Step 1: Write failing HUD interaction tests**

Render the HUD with Fraction Forest selected. Assert four visit buttons, the selected details, `aria-pressed`, Explore behavior, completion status, and Back to Worlds:

```tsx
expect(screen.getAllByRole('button', { name: /^Visit / })).toHaveLength(4);
expect(screen.getByRole('button', { name: 'Visit Fraction Forest' }).getAttribute('aria-pressed')).toBe('true');
fireEvent.click(screen.getByRole('button', { name: 'Visit Number Valley' }));
expect(onRegionSelect).toHaveBeenCalledWith('number-valley');
fireEvent.click(screen.getByRole('button', { name: 'Explore Fraction Forest' }));
expect(onExplore).toHaveBeenCalled();
```

- [ ] **Step 2: Run the HUD test to verify it fails**

Run: `npm test --workspace=@wiggle/web -- MathHud.test.tsx`

Expected: FAIL because `MathHud` does not exist.

- [ ] **Step 3: Implement the HUD and its responsive styles**

Match the Science HUD structure: top line, topic controls, selected-region card, primary Explore button, and polite completion status. Use `Trees`, `ListOrdered`, `Shapes`, and `Gem` from `lucide-react`; render icons with `aria-hidden="true"`. Each topic button must combine icon, name, and color marker. Completed regions display text such as `Complete` in addition to styling.

Add `:focus-visible` outlines, mobile wrapping, adequate contrast, and a `@media (prefers-reduced-motion: reduce)` block that removes HUD transitions.

- [ ] **Step 4: Run the HUD tests**

Run: `npm test --workspace=@wiggle/web -- MathHud.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/math/MathHud.tsx apps/web/components/math/MathHud.test.tsx apps/web/components/math/mathPlanet.module.css
git commit -m "feat: add Numeria region HUD"
```

---

### Task 4: Build the reusable Maths activity session

**Files:**
- Create: `apps/web/components/math/MathActivitySession.tsx`
- Create: `apps/web/components/math/MathActivitySession.module.css`
- Create: `apps/web/components/math/MathActivitySession.test.tsx`

**Interfaces:**
- Consumes: `MathRegionId`, `mathActivity`, `isCorrectMathAnswer`.
- Produces: `MathActivitySession({ region, onComplete, onClose })`.
- Calls `onComplete(region)` once after the third correct answer.

- [ ] **Step 1: Write failing interaction tests for the shared session**

Use a parameterized test over all four region IDs. For each activity, select a wrong answer and assert `role="alert"` plus unchanged challenge count; then answer all three correctly and assert the completion heading, `onComplete(region)`, and a `Back to Numeria` button.

```tsx
it.each(MATH_REGION_IDS)('completes %s after three correct answers', region => {
  const complete = vi.fn();
  render(<MathActivitySession region={region} onComplete={complete} onClose={vi.fn()} />);
  for (const challenge of MATH_ACTIVITIES[region].challenges) {
    fireEvent.click(screen.getByRole('button', { name: challenge.answer }));
    fireEvent.click(screen.getByRole('button', { name: 'Check answer' }));
  }
  expect(complete).toHaveBeenCalledOnce();
  expect(screen.getByRole('heading', { name: /wonderful exploring/i })).toBeTruthy();
});
```

Also assert answer options are a labelled `radiogroup`, Check is disabled until an option is chosen, and an incorrect answer re-enables selection for retry.

- [ ] **Step 2: Run the session tests to verify they fail**

Run: `npm test --workspace=@wiggle/web -- MathActivitySession.test.tsx`

Expected: FAIL because the session component does not exist.

- [ ] **Step 3: Implement the state machine and semantic controls**

Track `challengeIndex`, `selectedAnswer`, `feedback`, `correctCount`, and `finished`. Submit behavior must be:

```ts
if (!selectedAnswer) return;
if (!isCorrectMathAnswer(challenge, selectedAnswer)) {
  setFeedback({ kind: 'error', text: `Try again. ${challenge.hint}` });
  setSelectedAnswer(null);
  return;
}
if (challengeIndex === activity.challenges.length - 1) {
  setFinished(true);
  onComplete(region);
  return;
}
setChallengeIndex(index => index + 1);
setSelectedAnswer(null);
setFeedback({ kind: 'success', text: 'Correct. Here is the next discovery.' });
```

Render each `MathVisual` with CSS shapes and text, never emoji: fraction segments, number tiles, polygon CSS/SVG, and crystal counters using the Lucide `Gem` icon. Keep one prompt and one primary action visible at a time.

- [ ] **Step 4: Add ADHD-friendly and accessible styling**

Use a centered card, short line lengths, large option targets, strong selected states, persistent progress text (`Challenge 2 of 3`), and localized success/error feedback. Disable all decorative transforms/animations under reduced motion. Ensure options use native radio inputs or buttons with complete radio semantics.

- [ ] **Step 5: Run the activity tests**

Run: `npm test --workspace=@wiggle/web -- MathActivitySession.test.tsx`

Expected: PASS for all four activities, retries, completion, and semantic control assertions.

- [ ] **Step 6: Commit**

```bash
git add apps/web/components/math/MathActivitySession.tsx apps/web/components/math/MathActivitySession.module.css apps/web/components/math/MathActivitySession.test.tsx
git commit -m "feat: add four Numeria mini activities"
```

---

### Task 5: Orchestrate Numeria like Science Planet

**Files:**
- Create: `apps/web/components/math/MathPlanet.tsx`
- Create: `apps/web/components/math/MathPlanetCanvas.tsx`
- Create: `apps/web/components/math/MathPlanetCanvas.test.tsx`
- Modify: `apps/web/components/math/mathPlanet.module.css`

**Interfaces:**
- Produces: `MathPlanetProps = { quality?, reducedMotion?, onBackToWorlds, onSessionOpenChange? }`.
- Consumes: `UniverseCanvas`, `MathHud`, `MathActivitySession`, `ActivitySessionFrame`, `LANDMARKS`.
- `MathPlanetCanvas` owns `selectedRegion`, `session`, `completedRegions`, `mode`, and `destination`.

- [ ] **Step 1: Write failing controller tests with a mocked universe**

Mock `UniverseCanvas` so tests can invoke `onLandmarkSelect` and inspect the supplied HUD without WebGL. Verify:

- Fraction Forest is selected initially.
- Selecting each region updates the HUD and destination.
- Explore opens the matching activity dialog.
- `onSessionOpenChange(true)` fires on open and `false` on close.
- completing an activity marks only that region complete.
- Escape closes the session through `ActivitySessionFrame`.
- a missing activity mapping shows a polite unavailable message and does not leave an empty dialog.

- [ ] **Step 2: Run the controller test to verify it fails**

Run: `npm test --workspace=@wiggle/web -- MathPlanetCanvas.test.tsx`

Expected: FAIL because the Numeria controller does not exist.

- [ ] **Step 3: Implement `MathPlanet` and controller state**

`MathPlanet` wraps the client canvas in a section labelled `Numeria`. `MathPlanetCanvas` renders the existing math-themed universe and passes a custom HUD:

```tsx
<UniverseCanvas
  theme="math"
  quality={quality}
  reducedMotion={reducedMotion}
  mode={mode}
  onModeChange={setMode}
  destination={destination}
  onDestinationChange={setDestination}
  selectedLandmark={selectedRegion}
  onLandmarkSelect={selectRegion}
  controlsDisabled={session !== null}
  hud={<MathHud ... />}
/>
```

`selectRegion` looks up the matching `LANDMARKS` destination, changes the camera to follow, and never accepts `lexi`. `openSession` validates `MATH_ACTIVITIES[selectedRegion]` before setting the session. Wrap the universe and activity in `ActivitySessionFrame`, make the universe inert during a session, and keep it mounted so returning feels identical to Science.

- [ ] **Step 4: Add camera controls and completion presentation**

Add `View whole planet`/`Follow explorer` and `Reset view` controls matching Science placement and styles. Feed `completedRegions` to `MathHud`, and show `Wonderful exploring! {region name} complete.` via `aria-live="polite"` after returning.

- [ ] **Step 5: Run controller and Science regression tests**

Run: `npm test --workspace=@wiggle/web -- MathPlanetCanvas.test.tsx SciencePlanetCanvas.test.tsx`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/web/components/math/MathPlanet.tsx apps/web/components/math/MathPlanetCanvas.tsx apps/web/components/math/MathPlanetCanvas.test.tsx apps/web/components/math/mathPlanet.module.css
git commit -m "feat: add Science-style Numeria planet flow"
```

---

### Task 6: Route the Maths world through the new experience

**Files:**
- Modify: `apps/web/components/worlds/SubjectWorlds.tsx`
- Modify: `apps/web/components/worlds/SubjectWorlds.test.tsx`
- Modify: `apps/web/components/universe/ExplorationHud.tsx`
- Modify: `apps/web/components/universe/ExplorationHud.test.tsx`

**Interfaces:**
- Consumes: `MathPlanet` with the same overlay/back callbacks formerly supplied to `MissionAtlas`.
- Preserves: `MATHS_MISSION_BLOCKED_MESSAGE` as shared navigation copy; move it to `components/math/MathPlanet.tsx` or a small exported Maths constant and update imports.

- [ ] **Step 1: Update route tests to expect `MathPlanet`**

Replace the `MissionAtlas` mock in `SubjectWorlds.test.tsx` with a `MathPlanet` mock exposing buttons that call `onSessionOpenChange` and `onBackToWorlds`. Keep the assertions for child ownership where applicable, quality forwarding, returning to Worlds, and blocking popstate navigation while a Maths session is open.

Add an `ExplorationHud` test asserting `Numeria destinations` contains four learning-region buttons and omits `Lexi's beacon`.

- [ ] **Step 2: Run the routing tests to verify they fail**

Run: `npm test --workspace=@wiggle/web -- SubjectWorlds.test.tsx ExplorationHud.test.tsx`

Expected: FAIL because `SubjectWorlds` still renders `MissionAtlas` and the legacy navigator includes Lexi.

- [ ] **Step 3: Switch the Maths route**

Import `MathPlanet` and render it for `route.world === 'math'`:

```tsx
<MathPlanet
  quality={quality}
  onSessionOpenChange={setMathsOverlayOpen}
  onBackToWorlds={() => navigate({ world: null, child: currentChild })}
/>
```

Preserve the Parent link and Twin launcher behavior. Keep Maths session navigation blocking exactly as before. Filter `LANDMARKS` in `ExplorationHud` to exclude `lexi` so only the four actual learning regions appear anywhere learners choose activities.

- [ ] **Step 4: Run routing and world-selector tests**

Run: `npm test --workspace=@wiggle/web -- SubjectWorlds.test.tsx ExplorationHud.test.tsx WorldSelector.test.tsx PlanetCarousel.test.tsx`

Expected: PASS, including disabled unavailable-world controls and existing lock presentation assertions.

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/worlds/SubjectWorlds.tsx apps/web/components/worlds/SubjectWorlds.test.tsx apps/web/components/universe/ExplorationHud.tsx apps/web/components/universe/ExplorationHud.test.tsx
git commit -m "feat: route Numeria through region activities"
```

---

### Task 7: Verify visual, accessibility, and production behavior

**Files:**
- Modify only files from Tasks 1-6 when verification reveals a defect.

**Interfaces:**
- Validates the complete feature; produces no new public interface.

- [ ] **Step 1: Run all focused Maths and Science tests**

Run:

```bash
npm test --workspace=@wiggle/web -- mathActivities.test.ts MathHud.test.tsx MathActivitySession.test.tsx MathPlanetCanvas.test.tsx SubjectWorlds.test.tsx SciencePlanetCanvas.test.tsx Numeria.test.tsx PlanetCarousel.test.tsx WorldSelector.test.tsx
```

Expected: PASS.

- [ ] **Step 2: Run the full web test suite**

Run: `npm test --workspace=@wiggle/web`

Expected: PASS with no new failures. Existing jsdom canvas warnings may appear but must not hide test failures.

- [ ] **Step 3: Run static verification**

Run: `npm run typecheck --workspace=@wiggle/web`

Expected: PASS with no TypeScript errors.

Run: `npm run lint --workspace=@wiggle/web`

Expected: PASS with no ESLint errors, especially unused Lucide imports.

- [ ] **Step 4: Run the production build**

Run: `npm run build --workspace=@wiggle/web`

Expected: Next.js production build completes successfully.

- [ ] **Step 5: Perform a keyboard and reduced-motion review**

Start the app with `npm run dev --workspace=@wiggle/web`. Enter Numeria, traverse all region controls with Tab, open each activity, submit one wrong and all correct answers, close with Escape, and return to Worlds. Repeat with reduced motion enabled and verify no essential state is communicated only through motion or color.

- [ ] **Step 6: Commit verification fixes if any**

If verification required changes, stage only those files and commit:

```bash
git add apps/web/components/math apps/web/components/planet apps/web/components/science/ScienceSessionFrame.tsx apps/web/components/worlds/SubjectWorlds.tsx apps/web/components/worlds/SubjectWorlds.test.tsx apps/web/components/universe/ExplorationHud.tsx apps/web/components/universe/ExplorationHud.test.tsx
git commit -m "fix: polish Numeria learning experience"
```

If no files changed, do not create an empty commit.

---

## Self-Review

- Spec coverage: all four regions, Science-style selection/session flow, retry behavior, completion, safe fallback, keyboard semantics, reduced motion, existing Science regression coverage, unavailable-world locks, and production verification are assigned to explicit tasks.
- Scope: backend persistence and broader platform work remain excluded.
- Placeholder scan: the plan contains no deferred implementation markers; activity types, component contracts, state transitions, commands, and expected assertions are explicit.
- Type consistency: `MathRegionId`, `MathActivitySession`, `MathHud`, `MathPlanet`, and `ActivitySessionFrame` signatures are defined once and used consistently by later tasks.
