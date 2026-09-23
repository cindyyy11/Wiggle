# Magnet Lands → HandActivityShell Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate Magnet Lands onto `HandActivityShell` so it shares Phase 1 chrome and gesture coaching, without changing magnet gameplay or 3D.

**Architecture:** Extend `gestureCoach` with a `magnet` `CoachMode`. Rewrite `MagnetLabMission` to render `HandActivityShell` + `MagnetHandLabScene`, keep Objects key as Magnet-only UI outside the shell’s React API (positioned to match today’s look), and leave `magnetHandPlay` / scene rules untouched.

**Tech Stack:** Next.js 15 / React 19, TypeScript, Vitest (jsdom). No new dependencies.

**Spec:** `docs/superpowers/specs/2026-09-23-magnet-hand-shell-design.md`

## Global Constraints

- Keep current magnet gameplay (`magnetHandPlay`, `MagnetHandLabScene` behaviour, checkpoints, attraction sounds).
- Do not rename `MagnetLabMission` or `magnetLab.module.css`.
- Do not add a first-class shell `extras` / Objects slot — Objects key stays Magnet-owned.
- Exact nudge copy from the spec (open palm / pinch / point lines).
- `SciencePlanetCanvas` keeps calling `<MagnetLabMission manageFocus={false} onExit={…} onComplete={…} />` with no behavioural change.
- Commit messages use conventional prefixes and carry **no** `Co-Authored-By` or Claude trailers.
- All commands run from `apps/web` unless stated. Unit tests: `npx vitest run <file>`. Typecheck: `npx tsc --noEmit`. Lint: `npx eslint <paths>`.

---

## File Structure

| File | Responsibility |
| --- | --- |
| `apps/web/components/handActivity/gestureCoach.ts` | Add magnet `CoachMode`; hints + wrong lines + `phaseKey`. |
| `apps/web/components/handActivity/gestureCoach.test.ts` | Magnet coach coverage. |
| `apps/web/components/science/MagnetLabMission.tsx` | Shell wrap; play state; Objects key; complete/exit. |
| `apps/web/components/science/magnetLab.module.css` | Wrapper + Objects positioning so key still sits in the right column without living inside shell JSX API. |
| `apps/web/components/science/MagnetLabMission.test.tsx` | Update for shell chrome / Your Hand tips; keep play + complete + exit. |
| `apps/web/components/science/MagnetLabMission.camera.test.tsx` | Keep green (adjust selectors only if needed). |
| `design-qa.md` | Phase 3 verification record. |

---

### Task 1: Magnet `CoachMode` in `gestureCoach`

**Files:**
- Modify: `apps/web/components/handActivity/gestureCoach.ts`
- Modify: `apps/web/components/handActivity/gestureCoach.test.ts`

**Interfaces:**
- Consumes: existing `GestureHint`, `NudgeState`, `nextNudge`.
- Produces: extend

```ts
export type CoachMode =
  | { kind: "bench"; phase: BenchPhase; holding: boolean }
  | { kind: "answer"; phase: AnswerPhase }
  | { kind: "magnet"; checkpoint: "explore" | "sort" | "hidden"; holding: boolean };
```

- `phaseKey`: `magnet:${checkpoint}:${holding ? "hold" : "idle"}`.
- `expectedHint`: explore → `open_palm`; sort idle → `pinch`; sort holding → `open_palm`; hidden → `point`.
- `wrongGestureLine` exact strings:
  - explore wrong: `Open your palm to move the magnet!`
  - sort idle wrong: `Pinch to pick up an object!`
  - sort holding wrong: `Open your palm over PULLS or NO PULL!`
  - hidden wrong: `Point to find the hidden magnet!`

- [ ] **Step 1: Write the failing tests**

Append to `gestureCoach.test.ts`:

```ts
const explore: CoachMode = { kind: "magnet", checkpoint: "explore", holding: false };
const sortIdle: CoachMode = { kind: "magnet", checkpoint: "sort", holding: false };
const sortHold: CoachMode = { kind: "magnet", checkpoint: "sort", holding: true };
const hidden: CoachMode = { kind: "magnet", checkpoint: "hidden", holding: false };

describe("magnet coach", () => {
  it("maps checkpoints to hints", () => {
    expect(expectedHint(explore)).toBe("open_palm");
    expect(expectedHint(sortIdle)).toBe("pinch");
    expect(expectedHint(sortHold)).toBe("open_palm");
    expect(expectedHint(hidden)).toBe("point");
  });

  it("nudges wrong gestures with Magnet copy", () => {
    expect(wrongGestureLine(explore, "point")).toBe("Open your palm to move the magnet!");
    expect(wrongGestureLine(explore, "open_palm")).toBeNull();
    expect(wrongGestureLine(sortIdle, "point")).toBe("Pinch to pick up an object!");
    expect(wrongGestureLine(sortHold, "pinch")).toBe("Open your palm over PULLS or NO PULL!");
    expect(wrongGestureLine(hidden, "pinch")).toBe("Point to find the hidden magnet!");
    expect(wrongGestureLine(hidden, "point")).toBeNull();
  });

  it("re-arms magnet nudges when checkpoint or holding changes", () => {
    const state = nextNudge(initialNudgeState(explore), explore, "point").state;
    expect(nextNudge(state, sortIdle, "point").nudge).toBe("Pinch to pick up an object!");
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `npx vitest run components/handActivity/gestureCoach.test.ts`  
Expected: FAIL (magnet kind not handled / type error).

- [ ] **Step 3: Implement**

Update `gestureCoach.ts`:

```ts
import type { MagnetCheckpoint } from "../science/magnetHandPlay";
// Prefer duplicating the union "explore" | "sort" | "hidden" in gestureCoach
 // if importing MagnetCheckpoint would create an awkward handActivity → science cycle.
 // Prefer inline union in CoachMode to keep gestureCoach free of science imports.
```

Implement `phaseKey` / `expectedHint` / `wrongGestureLine` branches for `kind === "magnet"` with the exact strings above. Keep `nextNudge` unchanged (it already uses those helpers).

- [ ] **Step 4: Run — PASS**

Run: `npx vitest run components/handActivity/gestureCoach.test.ts`

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/handActivity/gestureCoach.ts apps/web/components/handActivity/gestureCoach.test.ts
git commit -m "feat: add magnet gesture coaching modes"
```

---

### Task 2: Rewrite `MagnetLabMission` onto `HandActivityShell`

**Files:**
- Modify: `apps/web/components/science/MagnetLabMission.tsx`
- Modify: `apps/web/components/science/magnetLab.module.css`
- Modify: `apps/web/components/science/MagnetLabMission.test.tsx`
- Modify: `apps/web/components/science/MagnetLabMission.camera.test.tsx` (only if selectors break)

**Interfaces:**
- Consumes: `HandActivityShell`, Task 1 magnet `CoachMode`, existing `magnetPlayReducer` / `MagnetHandLabScene` / `MAGNET_OBJECTS`.
- Produces: same public props `{ onExit(); onComplete(); manageFocus?: boolean }`.
- Mission no longer calls `useHandTracking` or renders its own backdrop / exit / mission card / guide / camera card.
- Objects key remains Magnet-owned; place it so layout matches today (see CSS note below).
- Cancel held object when the workbench unmounts (camera not ready) — mission no longer has local `ready` from tracking.

**CSS note (Objects key):** `.objectKey` uses mission grid columns. After migration it cannot sit inside shell JSX without a new shell slot. Add a full-size wrapper around the shell:

```css
.magnetShellWrap { position: relative; width: 100%; height: 100%; min-height: 0; }
.magnetShellWrap > .objectKey {
  position: absolute;
  right: clamp(.75rem, 2.5vw, 2rem);
  bottom: clamp(.75rem, 2.5vw, 2rem);
  left: auto;
  top: auto;
  width: min(16rem, 28%);
  max-height: 42%;
  grid-column: unset;
  grid-row: unset;
}
/* Keep existing mobile flex overrides readable; under the narrow media query,
   prefer static/flow placement under the shell if absolute crowding is bad —
   mirror prior order: Objects near the bottom of the column. */
```

Tune so desktop still reads as “right column under Your Hand”; do not invent a shell API.

**Coach / card copy (keep Magnet strings):**

```ts
const copy = {
  explore: "Move your open hand to guide the magnet!",
  sort: "Pinch an object, drop it on PULLS or NO PULL.",
  hidden: "Point around the campsite to find the hidden magnet.",
};
const titles = { explore: "What does a magnet pull?", sort: "Find each object's home", hidden: "A campsite mystery!" };
const coachLines = {
  explore: "Move your hand to guide the magnet. What will it pull?",
  sort: "Sorting time! Metal goes on PULLS. Everything else goes on NO PULL.",
  hidden: "A magnet is hiding by the toolbox. Point to find it!",
  complete: "You did it! Magnet Lab complete — wonderful exploring!",
} as const;
```

Shell already owns starting / help speech (`STARTING_LINE` / `HELP_LINE`). Pass phase `coach` from Magnet when playing; on complete pass `coachLines.complete`.

- [ ] **Step 1: Adjust failing / brittle tests first (TDD where behaviour changes)**

In `MagnetLabMission.test.tsx`, update expectations that assumed Magnet-owned speech for live tips:

- Graphics-failure tip: assert `getByText(/graphics-capable/i)` (Your Hand card), not necessarily `getByRole("status")`.
- Starting speech may be shell’s `Hi! I'm Wiggle. Let's get your camera ready.` (still matches `/I'm Wiggle/`).
- Ready speech comes from `coach` prop (`guide the magnet`) — keep those assertions.
- Aria label: shell uses `label` prop — set `label="Magnet Lab mission"` so existing `aria-label` expectations stay valid if any.
- Focus tests: shell restore may differ from Magnet’s `Start Magnet Lab` microtask hack. Prefer aligning with shell behaviour (previous focus / exit button). Update or slim focus tests that relied on Magnet-only restore if they fail after the rewrite — do not re-implement duplicate focus logic in the mission.

Keep: tracking enabled via shell, adult help, pull/stay sounds, complete once, cancel held when readiness lost, Objects key visible in explore.

- [ ] **Step 2: Run Magnet mission tests — expect FAIL** (not yet rewritten)

Run: `npx vitest run components/science/MagnetLabMission.test.tsx`

- [ ] **Step 3: Implement `MagnetLabMission`**

Target shape (illustrative — match file style):

```tsx
"use client";
import { useEffect, useMemo, useReducer, useRef } from "react";
import { HandActivityShell } from "../handActivity/HandActivityShell";
import { useWiggleSound } from "../../features/audio/useWiggleSound";
import { MagnetHandLabScene } from "./MagnetHandLabScene";
import { initialMagnetPlay, magnetPlayReducer } from "./magnetHandPlay";
import { MAGNET_OBJECTS } from "./scienceWorld";
import styles from "./magnetLab.module.css";

export type MagnetLabMissionProps = { onExit(): void; onComplete(): void; manageFocus?: boolean };

export function MagnetLabMission({ onExit, onComplete, manageFocus = true }: MagnetLabMissionProps) {
  const sound = useWiggleSound();
  const [state, dispatch] = useReducer(magnetPlayReducer, initialMagnetPlay);
  const notified = useRef(false);
  const playSound = useRef(sound.play);
  const unlockSound = useRef(sound.unlock);
  playSound.current = sound.play;
  unlockSound.current = sound.unlock;

  useEffect(() => { unlockSound.current(); }, []);

  useEffect(() => {
    if (!state.foundHiddenMagnet || notified.current) return;
    notified.current = true;
    onComplete();
  }, [state.foundHiddenMagnet, onComplete]);

  const count = state.checkpoint === "explore" ? state.explored.length
    : state.checkpoint === "sort" ? state.sorted.length
    : Number(state.foundHiddenMagnet);
  const total = state.checkpoint === "hidden" ? 1 : MAGNET_OBJECTS.length;
  const coachMode = useMemo(
    () => ({ kind: "magnet" as const, checkpoint: state.checkpoint, holding: !!state.held }),
    [state.checkpoint, state.held],
  );
  const coach = state.foundHiddenMagnet ? coachLines.complete : coachLines[state.checkpoint];
  const step = `Mission ${state.checkpoint === "explore" ? 1 : state.checkpoint === "sort" ? 2 : 3} of 3`;

  const objects = !state.foundHiddenMagnet && state.checkpoint !== "hidden" ? (
    <aside className={styles.objectKey} aria-label="Magnet Lab objects">
      <h2>Objects</h2>
      <ul>
        {MAGNET_OBJECTS.map((object) => {
          const learned = state.explored.includes(object.id) || state.sorted.includes(object.id) || state.checkpoint === "sort";
          return <li key={object.id} data-result={learned ? object.result : "mystery"}>
            <span>{object.name.replace(/\b\w/g, (letter) => letter.toUpperCase())}</span>
            <strong>{learned ? (object.result === "attracted" ? "Pulls" : "No pull") : "Try it"}</strong>
          </li>;
        })}
      </ul>
    </aside>
  ) : null;

  return <div className={styles.magnetShellWrap}>
    <HandActivityShell
      label="Magnet Lab mission"
      title={titles[state.checkpoint]}
      instruction={copy[state.checkpoint]}
      progress={{ count, total, label: "discoveries" }}
      step={step}
      coach={coach}
      coachMode={coachMode}
      exitLabel="Back to Science Planet"
      onExit={onExit}
      manageFocus={manageFocus}
    >
      {(scene) => <MagnetWorkbench
        latest={scene.latest}
        reducedMotion={scene.reducedMotion}
        onHandStatus={scene.onHandStatus}
        state={state}
        held={state.held}
        dispatch={dispatch}
        onAttractionCue={(cue) => {
          unlockSound.current();
          playSound.current(cue === "pull" ? "magnetPull" : "magnetStay");
        }}
      />}
    </HandActivityShell>
    {objects}
  </div>;
}

/** Cancels a held sort item when the shell unmounts the workbench (camera not ready). */
function MagnetWorkbench({ held, dispatch, ...sceneProps }: /* wire MagnetHandLabScene props + held + dispatch */) {
  useEffect(() => () => {
    if (held) dispatch({ type: "cancel", id: held });
  }, [held, dispatch]);
  return <MagnetHandLabScene {...sceneProps} onAction={dispatch} />;
}
```

Fill types properly; keep `MagnetHandLabScene` props identical. Do not duplicate shell chrome.

- [ ] **Step 4: Run Magnet tests — PASS**

```bash
npx vitest run components/science/MagnetLabMission.test.tsx components/science/MagnetLabMission.camera.test.tsx
```

Fix CSS / assertions until green. Confirm Objects key still `getByLabelText("Magnet Lab objects")` in explore.

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/science/MagnetLabMission.tsx apps/web/components/science/magnetLab.module.css apps/web/components/science/MagnetLabMission.test.tsx apps/web/components/science/MagnetLabMission.camera.test.tsx
git commit -m "feat: run Magnet Lands inside HandActivityShell"
```

---

### Task 3: Regression + design-qa

**Files:**
- Modify: `design-qa.md`
- Verify: Science canvas still wires Magnet (no code change expected)

- [ ] **Step 1: Run related suites**

```bash
npx vitest run components/handActivity/gestureCoach.test.ts components/science/MagnetLabMission.test.tsx components/science/MagnetLabMission.camera.test.tsx components/science/SciencePlanetCanvas.test.tsx components/science/SciencePlanetCanvas.completion.test.tsx
npx tsc --noEmit
npx eslint components/handActivity/gestureCoach.ts components/science/MagnetLabMission.tsx --max-warnings 0
```

Expected: all PASS.

- [ ] **Step 2: Add design-qa section**

Prepend near the top of `design-qa.md` (after the title / with other dated sections):

```markdown
## Magnet Lands → HandActivityShell — 23 September 2026

result: automated checks pass; visual check is not yet checked in a live camera session.

Magnet Lands now uses shared `HandActivityShell` chrome and Phase 1 gesture hints/nudges for explore / sort / hidden. Gameplay (`magnetHandPlay` / `MagnetHandLabScene`) and Objects key behaviour are unchanged; Objects sits in a Magnet wrapper beside the shell.

Checked: gestureCoach magnet modes + MagnetLabMission (+ camera) unit files; Science planet canvas suites still green. Visual: live desktop / ~390 px Magnet session for hint glyph and nudge timing pending.

Not verifiable automatically: whether absolute Objects placement matches the old grid feel on every phone width — judgment call after a visual pass. Phase 4 3D redesign and constellation unlocks remain later.
```

- [ ] **Step 3: Commit**

```bash
git add design-qa.md
git commit -m "docs: record Magnet Lands HandActivityShell migration verification"
```

Do not push unless the owner asks.

---

## Self-review

- **Spec coverage:** shell wrap (Task 2); magnet `CoachMode` + exact nudge copy (Task 1); Objects key Magnet-owned with layout CSS (Task 2); `onComplete` / `onExit` / `manageFocus` preserved (Task 2); tests + design-qa (Tasks 2–3). Phase 4/5 out of scope.
- **Placeholders:** none — copy, types, and CSS strategy are concrete.
- **Type consistency:** `CoachMode` magnet fields match `coachMode` passed from `MagnetLabMission`; no science import cycle from `gestureCoach` (inline checkpoint union).
- **Risk called out:** Objects absolute CSS may need a one-line tweak after visual check; cancel-held-on-unmount replaces mission’s old `ready` effect.
