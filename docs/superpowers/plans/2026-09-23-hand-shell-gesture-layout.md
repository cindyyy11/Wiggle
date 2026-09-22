# Hand Shell Gesture Coaching & Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make camera-first hand activities easier for kids by clarifying which gesture to use, showing a small gesture hint, nudging on the wrong gesture, and stopping the top mission card from covering the workbench — all in the shared `HandActivityShell` so Science benches and Numeria regions both benefit.

**Architecture:** Add a pure `gestureCoach` module (hint + one-shot wrong-gesture nudge). Wire it through `HandActivityShell` (hint UI + coach override from live `tracking.latest.gesture`). Strengthen status/instruction copy in `handBenchFrame` / `ScienceHandSession` / `MathHandSession`. Tighten `magnetLab.module.css` mission card and add workbench top clearance.

**Tech Stack:** Next.js 15 / React 19, TypeScript, Vitest (jsdom). No new dependencies.

**Spec:** `docs/superpowers/specs/2026-09-23-hand-shell-gesture-layout-design.md`

## Global Constraints

- Phase 1 only — no Science “N of 4” cheer, Magnet → shell migration, Magnet 3D redesign, or constellation unlocks.
- Discover → **point**; match idle → **pinch**; match holding → **open_palm**; Numeria asking → **hold** (dwell). Wrong-gesture nudge is a tip only — never blocks play.
- At most one nudge per wrong streak; reset when the gesture becomes correct, tracking is lost, or the coach phase changes.
- Layout: keep mission card at top; shrink it; pad workbench — do not move/auto-hide the card.
- Commit messages use conventional prefixes and carry **no** `Co-Authored-By` or Claude trailers.
- All commands run from `apps/web` unless stated. Unit tests: `npx vitest run <file>`. Typecheck: `npx tsc --noEmit`. Lint: `npx eslint <paths>`.

---

## File Structure

| File | Responsibility |
| --- | --- |
| `apps/web/components/handActivity/gestureCoach.ts` | Pure. Expected hint glyph, wrong-gesture nudge line, and one-shot nudge streak state. |
| `apps/web/components/handActivity/gestureCoach.test.ts` | Unit tests for hint, nudge text, and streak reset rules. |
| `apps/web/components/handActivity/handBenchFrame.ts` | Stronger kid-facing discover/match/answer status strings. |
| `apps/web/components/handActivity/HandActivityShell.tsx` | Optional `coachMode`; renders gesture hint; overlays coach with nudge when streak fires. |
| `apps/web/components/science/ScienceHandSession.tsx` | Stronger mission-card instructions; passes `coachMode` for bench phase + holding. |
| `apps/web/components/math/MathHandSession.tsx` | Stronger hold copy on the mission card when asking; passes answer `coachMode`. |
| `apps/web/components/handActivity/HandBenchScene.tsx` | Reports `holding` upward so the shell’s coach mode stays accurate (via new optional callback). |
| `apps/web/components/science/magnetLab.module.css` | Smaller mission card; workbench top clearance; gesture-hint styles. |
| `design-qa.md` | Records verification. |

---

### Task 1: Pure gesture coach (hint + one-shot nudge)

**Files:**
- Create: `apps/web/components/handActivity/gestureCoach.ts`
- Test: `apps/web/components/handActivity/gestureCoach.test.ts`

**Interfaces:**
- Consumes: `Gesture` from `../../features/gestures/gestureClassifier`; `BenchPhase` from `./handBenchPlay`; `AnswerPhase` from `./answerPlay`.
- Produces:
  - `export type GestureHint = "point" | "pinch" | "open_palm" | "hold" | "none";`
  - `export type CoachMode = { kind: "bench"; phase: BenchPhase; holding: boolean } | { kind: "answer"; phase: AnswerPhase };`
  - `export function expectedHint(mode: CoachMode): GestureHint;`
  - `export function wrongGestureLine(mode: CoachMode, gesture: Gesture | null): string | null;` — `null` when gesture is null/correct/irrelevant; otherwise the kid tip.
  - `export type NudgeState = { phaseKey: string; delivered: boolean };`
  - `export function phaseKey(mode: CoachMode): string;`
  - `export function initialNudgeState(mode: CoachMode): NudgeState;`
  - `export function nextNudge(state: NudgeState, mode: CoachMode, gesture: Gesture | null): { state: NudgeState; nudge: string | null };`

- [ ] **Step 1: Write the failing test**

Create `apps/web/components/handActivity/gestureCoach.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  expectedHint,
  initialNudgeState,
  nextNudge,
  wrongGestureLine,
  type CoachMode,
} from "./gestureCoach";

const discover: CoachMode = { kind: "bench", phase: "discover", holding: false };
const matchIdle: CoachMode = { kind: "bench", phase: "match", holding: false };
const matchHold: CoachMode = { kind: "bench", phase: "match", holding: true };
const asking: CoachMode = { kind: "answer", phase: "asking" };

describe("expectedHint", () => {
  it("maps bench and answer phases to the kid-facing glyph", () => {
    expect(expectedHint(discover)).toBe("point");
    expect(expectedHint(matchIdle)).toBe("pinch");
    expect(expectedHint(matchHold)).toBe("open_palm");
    expect(expectedHint({ kind: "bench", phase: "done", holding: false })).toBe("none");
    expect(expectedHint(asking)).toBe("hold");
    expect(expectedHint({ kind: "answer", phase: "done" })).toBe("none");
    expect(expectedHint({ kind: "answer", phase: "celebrating" })).toBe("none");
  });
});

describe("wrongGestureLine", () => {
  it("nudges discover when the kid pinches or opens the palm", () => {
    expect(wrongGestureLine(discover, "pinch")).toBe("Try pointing your finger to discover!");
    expect(wrongGestureLine(discover, "open_palm")).toBe("Try pointing your finger to discover!");
    expect(wrongGestureLine(discover, "point")).toBeNull();
    expect(wrongGestureLine(discover, null)).toBeNull();
  });

  it("nudges match when idle and the kid points", () => {
    expect(wrongGestureLine(matchIdle, "point")).toBe("Pinch your fingers to pick it up!");
    expect(wrongGestureLine(matchIdle, "pinch")).toBeNull();
  });

  it("nudges match when holding and the kid pinches or points", () => {
    expect(wrongGestureLine(matchHold, "pinch")).toBe("Open your palm over its home to place it!");
    expect(wrongGestureLine(matchHold, "point")).toBe("Open your palm over its home to place it!");
    expect(wrongGestureLine(matchHold, "open_palm")).toBeNull();
  });

  it("does not nudge answer-hold for any classified gesture (dwell uses presence)", () => {
    expect(wrongGestureLine(asking, "pinch")).toBeNull();
    expect(wrongGestureLine(asking, "point")).toBeNull();
  });
});

describe("nextNudge", () => {
  it("delivers a wrong-gesture tip once per streak, then stays quiet until reset", () => {
    let state = initialNudgeState(discover);
    const first = nextNudge(state, discover, "pinch");
    expect(first.nudge).toBe("Try pointing your finger to discover!");
    state = first.state;
    expect(nextNudge(state, discover, "pinch").nudge).toBeNull();
  });

  it("re-arms after a correct gesture, then can nudge again", () => {
    let state = nextNudge(initialNudgeState(discover), discover, "pinch").state;
    state = nextNudge(state, discover, "point").state;
    expect(nextNudge(state, discover, "pinch").nudge).toBe("Try pointing your finger to discover!");
  });

  it("re-arms when the coach phase changes", () => {
    let state = nextNudge(initialNudgeState(discover), discover, "pinch").state;
    const switched = nextNudge(state, matchIdle, "point");
    expect(switched.nudge).toBe("Pinch your fingers to pick it up!");
  });

  it("re-arms when tracking is lost (null gesture) after a delivered nudge", () => {
    let state = nextNudge(initialNudgeState(discover), discover, "pinch").state;
    state = nextNudge(state, discover, null).state;
    expect(nextNudge(state, discover, "pinch").nudge).toBe("Try pointing your finger to discover!");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run components/handActivity/gestureCoach.test.ts`  
Expected: FAIL, `Failed to resolve import "./gestureCoach"`.

- [ ] **Step 3: Write `gestureCoach.ts`**

Create `apps/web/components/handActivity/gestureCoach.ts`:

```ts
import type { Gesture } from "../../features/gestures/gestureClassifier";
import type { AnswerPhase } from "./answerPlay";
import type { BenchPhase } from "./handBenchPlay";

export type GestureHint = "point" | "pinch" | "open_palm" | "hold" | "none";

export type CoachMode =
  | { kind: "bench"; phase: BenchPhase; holding: boolean }
  | { kind: "answer"; phase: AnswerPhase };

export type NudgeState = { phaseKey: string; delivered: boolean };

export function phaseKey(mode: CoachMode): string {
  return mode.kind === "bench" ? `bench:${mode.phase}:${mode.holding ? "hold" : "idle"}` : `answer:${mode.phase}`;
}

export function expectedHint(mode: CoachMode): GestureHint {
  if (mode.kind === "answer") {
    if (mode.phase === "asking") return "hold";
    return "none";
  }
  if (mode.phase === "discover") return "point";
  if (mode.phase === "match") return mode.holding ? "open_palm" : "pinch";
  return "none";
}

export function wrongGestureLine(mode: CoachMode, gesture: Gesture | null): string | null {
  if (!gesture) return null;
  if (mode.kind === "answer") return null;
  if (mode.phase === "discover") {
    return gesture === "point" ? null : "Try pointing your finger to discover!";
  }
  if (mode.phase === "match") {
    if (mode.holding) return gesture === "open_palm" ? null : "Open your palm over its home to place it!";
    return gesture === "pinch" ? null : "Pinch your fingers to pick it up!";
  }
  return null;
}

export function initialNudgeState(mode: CoachMode): NudgeState {
  return { phaseKey: phaseKey(mode), delivered: false };
}

/**
 * One tip per wrong streak. Re-arms when the phase key changes, when the gesture
 * becomes correct, or when tracking drops (null gesture) after a tip was shown.
 */
export function nextNudge(state: NudgeState, mode: CoachMode, gesture: Gesture | null): { state: NudgeState; nudge: string | null } {
  const key = phaseKey(mode);
  let current = state.phaseKey === key ? state : { phaseKey: key, delivered: false };
  const line = wrongGestureLine(mode, gesture);
  if (!gesture) return { state: { phaseKey: key, delivered: false }, nudge: null };
  if (!line) return { state: { phaseKey: key, delivered: false }, nudge: null };
  if (current.delivered) return { state: current, nudge: null };
  return { state: { phaseKey: key, delivered: true }, nudge: line };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run components/handActivity/gestureCoach.test.ts`  
Expected: PASS (all tests).

- [ ] **Step 5: Typecheck, lint and commit**

Run: `npx tsc --noEmit` and `npx eslint components/handActivity/gestureCoach.ts components/handActivity/gestureCoach.test.ts`

```bash
git add apps/web/components/handActivity/gestureCoach.ts apps/web/components/handActivity/gestureCoach.test.ts
git commit -m "feat: add pure gesture hint and one-shot wrong-gesture nudge coach"
```

---

### Task 2: Stronger status and mission-card copy

**Files:**
- Modify: `apps/web/components/handActivity/handBenchFrame.ts`
- Modify: `apps/web/components/handActivity/handBenchFrame.test.ts` (update expected strings)
- Modify: `apps/web/components/science/ScienceHandSession.tsx`
- Modify: `apps/web/components/math/MathHandSession.tsx`
- Modify: `apps/web/components/science/ScienceHandSession.test.tsx` only if it asserts the old instruction/coach strings

**Interfaces:**
- Consumes: none new.
- Produces: updated string constants used by “Your Hand” and mission cards (exact values below).

- [ ] **Step 1: Update `benchStatusForFrame` / `answerStatusForFrame` and their tests**

In `handBenchFrame.ts`, replace the status helpers with:

```ts
export function benchStatusForFrame(phase: BenchPhase, tracked: boolean, holding: boolean): string {
  if (!tracked) return holding ? "Tracking paused. Keep your hand in view." : "Show your hand to the camera.";
  if (phase === "discover") return "Point your finger at each one to discover it.";
  if (phase === "done") return "All done!";
  return holding ? "Open your palm over its home to place it." : "Pinch your fingers together to pick it up.";
}

export function answerStatusForFrame(phase: AnswerPhase, tracked: boolean): string {
  if (phase === "done") return "All done!";
  if (phase === "celebrating") return "Well done!";
  return tracked ? "Hold your hand steady over an answer." : "Show your hand to the camera.";
}
```

Update any assertions in `handBenchFrame.test.ts` to match these exact strings.

- [ ] **Step 2: Strengthen Science / Numeria mission-card instructions**

In `ScienceHandSession.tsx`, change the `instruction` prop to:

```tsx
instruction={discovering
  ? "Point your finger at each one to discover it."
  : state.phase === "match"
    ? "Pinch to pick up. Open your palm over its home."
    : "Wonderful exploring!"}
```

Also set the discover initial coach fallback when using `activity.instruction` only for the first land fact path — keep `MATCH_LINE` / `DONE_LINE` but update `MATCH_LINE` to:

```ts
const MATCH_LINE = "Now let's match! Pinch one, then open your palm over its home.";
```

(already correct — leave as-is if identical).

In `MathHandSession.tsx`, when not done, keep `challenge.prompt` as the mission title line for the puzzle, but add a steady gesture line via the shell’s `step` or a short prefix is **not** required; instead set:

```tsx
instruction={done ? "Wonderful exploring!" : `Hold your hand steady over an answer. ${challenge.prompt}`}
```

only if tests still pass and the card does not become too tall — **preferred smaller change:** leave `instruction={done ? "Wonderful exploring!" : challenge.prompt}` and rely on strengthened `answerStatusForFrame` + the gesture hint from Task 3 for Numeria. Do **not** concatenate the prompt if it makes the card taller; YAGNI.

Preferred Numeria change for this task: **none beyond what Task 3’s hint provides**, unless an existing test documents hold copy on the mission card. If `MathHandSession` has no hold instruction today, add only:

```tsx
step={done ? "All done!" : `Puzzle ${state.index + 1} of ${total} · Hold over an answer`}
```

- [ ] **Step 3: Run focused tests**

Run:

```bash
npx vitest run components/handActivity/handBenchFrame.test.ts components/science/ScienceHandSession.test.tsx components/math/MathHandSession.test.tsx
```

Expected: PASS (update any stale string assertions first).

- [ ] **Step 4: Typecheck, lint and commit**

Run: `npx tsc --noEmit` and `npx eslint components/handActivity/handBenchFrame.ts components/science/ScienceHandSession.tsx components/math/MathHandSession.tsx`

```bash
git add apps/web/components/handActivity/handBenchFrame.ts apps/web/components/handActivity/handBenchFrame.test.ts apps/web/components/science/ScienceHandSession.tsx apps/web/components/math/MathHandSession.tsx apps/web/components/science/ScienceHandSession.test.tsx
git commit -m "feat: clarify discover, match and hold gesture copy for kids"
```

(Only stage test files that actually changed.)

---

### Task 3: Wire hint + nudge into `HandActivityShell`

**Files:**
- Modify: `apps/web/components/handActivity/HandActivityShell.tsx`
- Modify: `apps/web/components/handActivity/HandActivityShell.test.tsx`
- Modify: `apps/web/components/handActivity/HandBenchScene.tsx`
- Modify: `apps/web/components/science/ScienceHandSession.tsx`
- Modify: `apps/web/components/math/MathHandSession.tsx`
- Modify: `apps/web/components/science/magnetLab.module.css` (hint styles only in this task — layout sizes in Task 4)

**Interfaces:**
- Consumes: `expectedHint`, `initialNudgeState`, `nextNudge`, `type CoachMode`, `type GestureHint` from `./gestureCoach`.
- Produces: `HandActivityShell` accepts optional `coachMode: CoachMode | null` (default `null` = no hint/nudge). When set, shell shows a hint glyph in “Your Hand” and may temporarily override the coach bubble with a nudge.

- [ ] **Step 1: Extend shell props and render the hint + nudge**

In `HandActivityShell.tsx`:

1. Add imports and props:

```tsx
import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { expectedHint, initialNudgeState, nextNudge, type CoachMode } from "./gestureCoach";
```

Add to `HandActivityShellProps`:

```ts
  /** When set, shows a gesture hint and may nudge Wiggle's line on the wrong gesture. */
  coachMode?: CoachMode | null;
```

2. Inside the component, after `ready` / `line` are defined, add nudge state driven by `tracking.latest` on an interval or by reading `tracking.latest.current` whenever status updates. Prefer a small `useEffect` that polls while `ready && coachMode` (every 200ms is enough — matches existing hand status refresh cadence):

```tsx
  const [nudge, setNudge] = useState<string | null>(null);
  const nudgeState = useRef(coachMode ? initialNudgeState(coachMode) : null);

  useEffect(() => {
    if (!ready || !coachMode) { setNudge(null); nudgeState.current = coachMode ? initialNudgeState(coachMode) : null; return; }
    const tick = () => {
      const gesture = tracking.latest.current.gesture;
      const result = nextNudge(nudgeState.current ?? initialNudgeState(coachMode), coachMode, gesture);
      nudgeState.current = result.state;
      if (result.nudge) setNudge(result.nudge);
    };
    tick();
    const id = window.setInterval(tick, 200);
    return () => window.clearInterval(id);
  }, [ready, coachMode, tracking.latest]);
```

Note: `coachMode` is an object — parents should pass a stable value via `useMemo` keyed on phase/holding.

3. Displayed coach line when ready: `const spoken = needsHelp ? HELP_LINE : !ready ? STARTING_LINE : (nudge ?? coach);` — replace uses of `line` that feed the bubble/`speakIfUnmuted` so a nudge is spoken once when `nudge` changes. Clear `nudge` when `coach` (parent line) changes from a real lesson event? Keep it simple: clear nudge after 2800ms:

```tsx
  useEffect(() => {
    if (!nudge) return;
    const id = window.setTimeout(() => setNudge(null), 2800);
    return () => window.clearTimeout(id);
  }, [nudge]);
```

4. In the “Your Hand” card, when `ready && coachMode`, render a hint before the status `<p>`:

```tsx
      {ready && coachMode ? <GestureHintGlyph hint={expectedHint(coachMode)} /> : null}
```

Add a tiny local helper in the same file (no new asset files):

```tsx
function GestureHintGlyph({ hint }: { hint: ReturnType<typeof expectedHint> }) {
  if (hint === "none") return null;
  const label = hint === "point" ? "Point" : hint === "pinch" ? "Pinch" : hint === "open_palm" ? "Open palm" : "Hold";
  return <p className={styles.gestureHint} data-hint={hint} aria-label={`Use this gesture: ${label}`}>
    <span className={styles.gestureHintGlyph} aria-hidden="true" data-hint={hint} />
    <span>{label}</span>
  </p>;
}
```

5. CSS for the hint (add to `magnetLab.module.css` in this task):

```css
.gestureHint { display: flex; align-items: center; gap: .45rem; margin: 0 0 .35rem; font-size: .78rem; font-weight: 700; color: #654d5c; }
.gestureHintGlyph { width: 1.35rem; height: 1.35rem; border-radius: 50%; background: #ffd991; box-shadow: inset 0 0 0 2px #72576b; position: relative; flex: 0 0 auto; }
.gestureHintGlyph[data-hint="point"]::after { content: ""; position: absolute; left: 55%; top: 20%; width: .22rem; height: .7rem; background: #342c43; border-radius: .2rem; transform: translateX(-50%); }
.gestureHintGlyph[data-hint="pinch"]::before, .gestureHintGlyph[data-hint="pinch"]::after { content: ""; position: absolute; width: .35rem; height: .35rem; border-radius: 50%; background: #342c43; top: 35%; }
.gestureHintGlyph[data-hint="pinch"]::before { left: 22%; }
.gestureHintGlyph[data-hint="pinch"]::after { right: 22%; }
.gestureHintGlyph[data-hint="open_palm"]::after { content: ""; position: absolute; inset: 22%; border: 2px solid #342c43; border-radius: 40%; }
.gestureHintGlyph[data-hint="hold"]::after { content: ""; position: absolute; inset: 28%; background: #342c43; border-radius: 50%; }
```

- [ ] **Step 2: Pass `coachMode` from Science and Numeria sessions**

`ScienceHandSession.tsx` — track holding via a callback from the scene:

Add to `HandBenchScene` props (in `HandBenchScene.tsx`):

```ts
  onHoldingChange?(holding: boolean): void;
```

In `BenchInteraction`’s `useFrame` (or wherever `s.held` is known), after computing status:

```ts
    reportHolding?.(s.held !== null);
```

with a ref-guard so it only fires on change (same pattern as `statusRef`).

In `ScienceHandSession`:

```tsx
  const [holding, setHolding] = useState(false);
  const coachMode = useMemo(
    () => ({ kind: "bench" as const, phase: state.phase, holding }),
    [state.phase, holding],
  );
```

Pass `coachMode={coachMode}` to `HandActivityShell` and `onHoldingChange={setHolding}` to `HandBenchScene`.

`MathHandSession.tsx`:

```tsx
  const coachMode = useMemo(
    () => ({ kind: "answer" as const, phase: state.phase }),
    [state.phase],
  );
```

Pass `coachMode={coachMode}` to `HandActivityShell`.

- [ ] **Step 3: Extend shell tests**

In `HandActivityShell.test.tsx`, add a case that with mocked `useHandTracking` `ready` + `coachMode` discover + gesture `pinch`, the spoken/status region eventually shows `Try pointing your finger to discover!` (advance timers by 200ms+). Follow existing mock patterns in that file.

- [ ] **Step 4: Run tests**

Run:

```bash
npx vitest run components/handActivity/gestureCoach.test.ts components/handActivity/HandActivityShell.test.tsx components/science/ScienceHandSession.test.tsx components/math/MathHandSession.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Typecheck, lint and commit**

Run: `npx tsc --noEmit` and `npx eslint components/handActivity components/science/ScienceHandSession.tsx components/math/MathHandSession.tsx`

```bash
git add apps/web/components/handActivity/HandActivityShell.tsx apps/web/components/handActivity/HandActivityShell.test.tsx apps/web/components/handActivity/HandBenchScene.tsx apps/web/components/science/ScienceHandSession.tsx apps/web/components/math/MathHandSession.tsx apps/web/components/science/magnetLab.module.css
git commit -m "feat: show gesture hints and wrong-gesture nudges in the hand shell"
```

---

### Task 4: Shrink mission card and clear the workbench

**Files:**
- Modify: `apps/web/components/science/magnetLab.module.css`

**Interfaces:**
- Consumes: none.
- Produces: tighter `.missionCard` / `.mission h1`; `.workbench` top padding so content clears the card.

- [ ] **Step 1: Apply layout CSS**

In `magnetLab.module.css`, change:

```css
.mission h1 { margin: 0; font-size: clamp(1.15rem, 2.2vw, 1.75rem); line-height: 1.15; letter-spacing: -.025em; text-wrap: balance; }
.missionCard { grid-column: 2; grid-row: 1; align-self: start; z-index: 2; text-align: center; padding: .75rem 1rem .65rem; background: #fff0d4; color: #342c43; border-radius: 1.25rem; box-shadow: 0 .75rem 2rem #100d2040; }
.missionCard p { margin: .4rem 0; font-size: .92rem; }
.progress { display: flex; justify-content: center; gap: .45rem; margin-top: .55rem; }
.progress span { width: .65rem; height: .65rem; border: 2px solid #72576b; border-radius: 50%; }
.workbench { grid-column: 1 / -1; grid-row: 1; min-width: 0; height: 100%; z-index: 1; padding-top: clamp(5.5rem, 18vh, 8.5rem); }
```

In the mobile block (`max-width: 48rem`), set:

```css
  .missionCard { padding: .7rem .85rem; max-height: 18vh; }
  .workbench { flex: 1 1 auto; min-height: 14rem; height: auto; padding-top: 0; }
```

(On mobile the flex column already stacks the card above the workbench, so drop the desktop top padding there.)

- [ ] **Step 2: Typecheck / lint (CSS-only — skip tsc if untouched) and commit**

```bash
git add apps/web/components/science/magnetLab.module.css
git commit -m "fix: shrink the hand mission card and clear the workbench under it"
```

- [ ] **Step 3: Visual check (controller)**

Rebuild/open Science Animal Types and one Numeria hand region at ~1440×900 and ~390×844. Confirm: mission card shorter; workbench items not under the card; gesture hint visible when ready; pinch during discover briefly shows the nudge tip. The implementer does not run this step.

---

### Task 5: Record verification

**Files:**
- Modify: `design-qa.md`

- [ ] **Step 1: Add the entry**

Add above the newest dated section:

```markdown
## Hand shell gesture coaching and layout — <date>

result: automated checks pass; visual check is <confirmed at desktop and ~390 px | not yet checked>.

Camera-first hand sessions (Science benches and Numeria regions) now share clearer gesture coaching in `HandActivityShell`: stronger discover/match/hold copy, a small gesture hint in “Your Hand”, and a one-shot wrong-gesture nudge from Wiggle. The top mission card is smaller and the workbench has top clearance on desktop so props are not covered.

Checked: <N> handActivity / science / math unit files covering `gestureCoach`, shell nudge behaviour, and status copy. Visual: Animal Types + one Numeria region at desktop and ~390 px for card covering and hint visibility.

Not verifiable automatically: whether kids understand the glyph without reading the label — judgment call. Magnet Lands still uses its own frame (Phase 3); completion cheer and constellation unlocks are later phases.
```

Fill `<date>`, `<N>`, and the confirmed/not-yet-checked marker from real runs.

- [ ] **Step 2: Commit**

```bash
git add design-qa.md
git commit -m "docs: record the hand-shell gesture and layout verification"
```

Do not push unless the owner asks.

---

## Self-review

- **Spec coverage:** pure coach (Task 1); stronger copy (Task 2); hint + nudge in shell for Science + Numeria (Task 3); layout option B (Task 4); design-qa (Task 5). Roadmap phases 2–5 untouched.
- **Type consistency:** `CoachMode` / `GestureHint` / `nextNudge` names match across Tasks 1 and 3; Science passes `bench` mode with `holding` from `HandBenchScene`; Math passes `answer` mode.
- **Placeholders:** none — copy strings, CSS values, and test cases are concrete. Visual check remains a controller step as in prior plans.
