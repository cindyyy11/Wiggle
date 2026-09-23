# Magnet Lab Feel Upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make explore pull/reject and sort bin feedback visually obvious in `MagnetHandLabScene` without changing curriculum rules or prop models.

**Architecture:** Add a tiny pure `magnetSceneFeel` module for timings/offsets. Upgrade explore (field ring, stick lerp, reject push) and sort (pad hover, correct pulse, wrong-drop wobble then home) inside `MagnetHandLabScene` only. Leave `magnetHandPlay` untouched.

**Tech Stack:** Next.js 15 / React 19, R3F / Three.js, TypeScript, Vitest (jsdom). No new dependencies.

**Spec:** `docs/superpowers/specs/2026-09-23-magnet-lab-feel-design.md`

## Global Constraints

- Visual/motion only — do **not** change `MAGNET_FIELD_RADIUS`, observe/grab/drop correctness, or hit targets in `magnetHandPlay`.
- Keep existing prop meshes (`MagnetObjectModel`, `HorseshoeMagnet`); no new art packs.
- Hidden checkpoint: no field ring, no bin VFX.
- `reducedMotion`: skip shake / push / fancy lerp; keep pose, color, banner, and pad truth.
- Sound cues stay edge-triggered (`magnetPull` / `magnetStay`).
- Commit messages use conventional prefixes and carry **no** `Co-Authored-By` or Claude trailers.
- All commands run from `apps/web` unless stated. Unit tests: `npx vitest run <file>`. Typecheck: `npx tsc --noEmit`. Lint: `npx eslint <paths>`.

---

## File Structure

| File | Responsibility |
| --- | --- |
| `apps/web/components/science/magnetSceneFeel.ts` | Pure timings + reject offset + pad pulse helpers. |
| `apps/web/components/science/magnetSceneFeel.test.ts` | Unit tests for those helpers. |
| `apps/web/components/science/MagnetHandLabScene.tsx` | Wire explore ring/stick/reject and sort hover/pulse/wobble. |
| `apps/web/components/science/MagnetHandLabScene.test.tsx` | Extend only if new pure exports need coverage; keep existing green. |
| `design-qa.md` | Phase 4 verification record. |

---

### Task 1: Pure `magnetSceneFeel` helpers

**Files:**
- Create: `apps/web/components/science/magnetSceneFeel.ts`
- Create: `apps/web/components/science/magnetSceneFeel.test.ts`

**Interfaces:**
- Produces:

```ts
export const WRONG_DROP_WOBBLE_MS = 300;
export const CORRECT_PAD_PULSE_MS = 280;
export const REJECT_PUSH_STRENGTH = 0.08; // table-space nudge away from magnet
export const METAL_FOLLOW_LERP = 0.42;    // was ~0.28 in scene — named for tests/docs
export const HOME_LERP = 0.12;
export const FIELD_RING_IDLE_OPACITY = 0.22;
export const FIELD_RING_ACTIVE_OPACITY = 0.55;

/** Offset a table point away from `from` by `strength` (clamped). */
export function rejectPushOffset(object: { x: number; y: number }, from: { x: number; y: number }, strength: number): { x: number; y: number };

/** True while `nowMs < startedAtMs + durationMs`. */
export function feedbackActive(startedAtMs: number, nowMs: number, durationMs: number): boolean;
```

- [ ] **Step 1: Write the failing test**

```ts
import { expect, it } from "vitest";
import {
  CORRECT_PAD_PULSE_MS,
  WRONG_DROP_WOBBLE_MS,
  feedbackActive,
  rejectPushOffset,
} from "./magnetSceneFeel";

it("exposes sort feedback durations from the spec", () => {
  expect(WRONG_DROP_WOBBLE_MS).toBe(300);
  expect(CORRECT_PAD_PULSE_MS).toBe(280);
});

it("pushes an object radially away from the magnet", () => {
  const next = rejectPushOffset({ x: 0.5, y: 0.5 }, { x: 0.4, y: 0.5 }, 0.08);
  expect(next.x).toBeGreaterThan(0.5);
  expect(next.y).toBeCloseTo(0.5, 5);
});

it("reports whether timed feedback is still active", () => {
  expect(feedbackActive(1000, 1200, 300)).toBe(true);
  expect(feedbackActive(1000, 1300, 300)).toBe(false);
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `npx vitest run components/science/magnetSceneFeel.test.ts`

- [ ] **Step 3: Implement `magnetSceneFeel.ts`**

```ts
export const WRONG_DROP_WOBBLE_MS = 300;
export const CORRECT_PAD_PULSE_MS = 280;
export const REJECT_PUSH_STRENGTH = 0.08;
export const METAL_FOLLOW_LERP = 0.42;
export const HOME_LERP = 0.12;
export const FIELD_RING_IDLE_OPACITY = 0.22;
export const FIELD_RING_ACTIVE_OPACITY = 0.55;

export function rejectPushOffset(
  object: { x: number; y: number },
  from: { x: number; y: number },
  strength: number,
): { x: number; y: number } {
  const dx = object.x - from.x;
  const dy = object.y - from.y;
  const len = Math.hypot(dx, dy) || 1;
  return { x: object.x + (dx / len) * strength, y: object.y + (dy / len) * strength };
}

export function feedbackActive(startedAtMs: number, nowMs: number, durationMs: number): boolean {
  return nowMs < startedAtMs + durationMs;
}
```

- [ ] **Step 4: Run — PASS**

Run: `npx vitest run components/science/magnetSceneFeel.test.ts`

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/science/magnetSceneFeel.ts apps/web/components/science/magnetSceneFeel.test.ts
git commit -m "feat: add Magnet Lab scene feel timing helpers"
```

---

### Task 2: Explore feel (field ring, stick, reject)

**Files:**
- Modify: `apps/web/components/science/MagnetHandLabScene.tsx`

**Interfaces:**
- Consumes: Task 1 constants + `rejectPushOffset`; existing `isWithinMagnetField`.
- Does not change `magnetHandPlay` or mission props.
- Explore only: ring under magnet; metal follow uses `METAL_FOLLOW_LERP` toward a point slightly under the horseshoe (`magnetTarget` with z ≈ 0.29 as today, optionally pull xy 5–8% toward magnet center); non-metal uses reject offset then `HOME_LERP` back; ring opacity idle vs active from Task 1 constants.
- `reducedMotion`: no push/shake/ring pulse — snap + colors/banners only.

- [ ] **Step 1: Implement explore visuals in `LabInteraction`**

Concrete changes inside the explore branch of `useFrame` / JSX:

1. Add a `mesh` ring (torus or thin cylinder) as child of the magnet group, `visible={checkpoint === "explore"}`, material transparent; set opacity each frame to `FIELD_RING_ACTIVE_OPACITY` when any object is in-field, else `FIELD_RING_IDLE_OPACITY` (or 0 when reducedMotion and idle — still show a static dim ring if desired).
2. When `shouldFollow`: lerp with `METAL_FOLLOW_LERP` (replace magic `0.28`); keep emissive/sparks/banner/pull cue.
3. When `nonMagneticFeedback` and not reducedMotion: set object target to `rejectPushOffset(homeOrCurrent, magnetTablePoint, REJECT_PUSH_STRENGTH)` converted via `tableX`/`tableY` for one short beat, then ease to home. Keep reject tint + `NO PULL` + stay cue.
4. Hide ring in sort/hidden.

Keep existing edge-triggered cue logic.

- [ ] **Step 2: Run scene + play tests**

```bash
npx vitest run components/science/MagnetHandLabScene.test.tsx components/science/magnetHandPlay.test.ts components/science/MagnetLabMission.test.tsx
```

Expected: PASS (no curriculum changes).

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/science/MagnetHandLabScene.tsx
git commit -m "feat: clarify Magnet explore pull and reject motion"
```

---

### Task 3: Sort feel (hover, correct pulse, wrong wobble)

**Files:**
- Modify: `apps/web/components/science/MagnetHandLabScene.tsx`
- Modify: `apps/web/components/science/MagnetHandLabScene.test.tsx` only if exporting a small pure helper for “which pad is hovered”

**Interfaces:**
- Consumes: `WRONG_DROP_WOBBLE_MS`, `CORRECT_PAD_PULSE_MS`, `feedbackActive`.
- Curriculum: wrong drop still immediately `held: null` via reducer; **visual** layer holds a local `wrongDrop: { id, atMs, tablePoint }` and wobbles that model until `feedbackActive` ends, then normal home lerp.
- Detect wrong drop: when `props.state.held` becomes null after a `drop` action whose target mismatched (track last drop via wrapping `onAction`, or compare previous held + last frame action). Prefer wrapping dispatch in `LabInteraction`:

```ts
const onAction = (action: MagnetPlayAction) => {
  if (action.type === "drop") {
    const result = /* same mapping as play: attracted vs not-attracted for action.id */;
    if (action.target !== result) {
      wrongDrop.current = { id: action.id, atMs: performance.now(), x: /* pad or object table pos */, y: … };
      padPulse.current = { pad: action.target, kind: "wrong", atMs: performance.now() };
    } else {
      padPulse.current = { pad: action.target, kind: "correct", atMs: performance.now() };
    }
  }
  action.current(action); // existing parent dispatch ref
};
```

Use `resultForMagnetObject` / object.result from `scienceWorld` — **do not** duplicate curriculum; import the same helper the play module uses if exported, or read `MAGNET_OBJECTS` entry `.result` (already on objects).

- Hover: while `held`, if pointer over attracted/not-attracted pad (`targetForSort` / existing hit radii), tint that pad mesh emissive.
- Correct pulse: green emissive for `CORRECT_PAD_PULSE_MS`.
- Wrong: red flash + model position wobble at drop site for `WRONG_DROP_WOBBLE_MS`, then home.
- Reduced motion: pad color flashes only; skip wobble.

- [ ] **Step 1: Implement sort feedback**

Update `SortTargets` to accept hover/pulse props (or refs) so pad materials can change. Wire wrong-drop local state in `LabInteraction` as above.

- [ ] **Step 2: Run tests**

```bash
npx vitest run components/science/MagnetHandLabScene.test.tsx components/science/magnetHandPlay.test.ts components/science/MagnetLabMission.test.tsx components/science/magnetSceneFeel.test.ts
```

Expected: PASS. Confirm wrong-drop still completes cancel in play tests (held null, not scored).

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/science/MagnetHandLabScene.tsx apps/web/components/science/MagnetHandLabScene.test.tsx
git commit -m "feat: add Magnet sort pad hover and wrong-drop feedback"
```

---

### Task 4: Regression + design-qa

**Files:**
- Modify: `design-qa.md`

- [ ] **Step 1: Run suites + lint/tsc**

```bash
npx vitest run components/science/magnetSceneFeel.test.ts components/science/MagnetHandLabScene.test.tsx components/science/magnetHandPlay.test.ts components/science/MagnetLabMission.test.tsx components/science/MagnetLabMission.camera.test.tsx
npx tsc --noEmit
npx eslint components/science/magnetSceneFeel.ts components/science/MagnetHandLabScene.tsx --max-warnings 0
```

- [ ] **Step 2: Prepend design-qa section**

```markdown
## Magnet Lab feel upgrade — 23 September 2026

result: automated checks pass; visual check is not yet checked in a live camera session.

Magnet explore now shows a field ring and clearer metal-stick vs non-metal reject motion. Sort pads hover while holding, pulse green on correct drops, and flash/wobble on wrong drops before the object returns home. Curriculum radii and grab/drop rules are unchanged.

Checked: `magnetSceneFeel`, MagnetHandLabScene, magnetHandPlay, MagnetLabMission (+ camera) unit files. Visual: live desktop / ~390 px explore + wrong sort drop pending.

Not verifiable automatically: whether the reject push reads as “no pull” for every kid — judgment call after a camera pass. Hidden checkpoint and constellation unlocks unchanged.
```

- [ ] **Step 3: Commit**

```bash
git add design-qa.md
git commit -m "docs: record the Magnet Lab feel upgrade verification"
```

Do not push unless the owner asks.

---

## Self-review

- **Spec coverage:** explore ring/stick/reject (Task 2); sort hover/pulse/wrong wobble (Task 3); pure timings (Task 1); reduced motion called out in Tasks 2–3; design-qa (Task 4). Hidden / play math / prop art out of scope.
- **Placeholders:** none — durations and helper signatures are concrete.
- **Type consistency:** `WRONG_DROP_WOBBLE_MS` / `CORRECT_PAD_PULSE_MS` match spec (~300 ms / ~200–300 ms); wrong drop still uses reducer cancel.
- **Risk:** Wrong-drop detection must wrap `onAction` carefully so play tests still see immediate `held: null` while visuals wobble locally.
