# Planet Completion Cheer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give Science Numeria-style “N of 4 lands complete” + Complete badges, and show a shared full-screen star cheer the first time a kid finishes all four Science lands or all four Numeria regions in this visit.

**Architecture:** Add a reusable `PlanetCompletionCheer` overlay. Extend `ScienceHud` / `SciencePlanetCanvas` to track `completedZones` like Numeria’s `completedRegions`, fire `onComplete` from `ScienceHandSession` when a bench reaches `done`, and queue the cheer until the session closes. Wire the same cheer into `MathPlanetCanvas` when the fourth region completes.

**Tech Stack:** Next.js 15 / React 19, TypeScript, Vitest (jsdom). No new dependencies.

**Spec:** `docs/superpowers/specs/2026-09-23-planet-completion-cheer-design.md`

## Global Constraints

- This visit only — no persistence / Twin / constellation unlocks (Phase 5).
- Show the full-screen cheer **after** the finishing session closes, not while the camera frame is open.
- Cheer once per visit (`cheerShown` / equivalent); completing four again must not re-show it.
- Exact copy from the spec (Science / Numeria titles, bodies, `Keep exploring`, `{n} of 4 lands complete`, badge `Complete`).
- Commit messages use conventional prefixes and carry **no** `Co-Authored-By` or Claude trailers.
- All commands run from `apps/web` unless stated. Unit tests: `npx vitest run <file>`. Typecheck: `npx tsc --noEmit`. Lint: `npx eslint <paths>`.

---

## File Structure

| File | Responsibility |
| --- | --- |
| `apps/web/components/planet/PlanetCompletionCheer.tsx` | Accessible full-screen cheer dialog. |
| `apps/web/components/planet/PlanetCompletionCheer.module.css` | Overlay layout + CSS stars. |
| `apps/web/components/planet/PlanetCompletionCheer.test.tsx` | Dismiss, Escape, copy, auto-dismiss. |
| `apps/web/components/science/ScienceHud.tsx` | `completedZones` → badges + “N of 4 lands complete”. |
| `apps/web/components/science/ScienceHud.test.tsx` | HUD completion chrome tests. |
| `apps/web/components/science/sciencePlanet.module.css` | Badge + quiet count styles (mirror Math). |
| `apps/web/components/science/ScienceHandSession.tsx` | `onComplete(land)` once on `done`. |
| `apps/web/components/science/SciencePlanetCanvas.tsx` | `completedZones`, return messages, queue cheer. |
| `apps/web/components/math/MathPlanetCanvas.tsx` | Show cheer when 4 regions done after session close. |
| `design-qa.md` | Verification record. |

---

### Task 1: Shared `PlanetCompletionCheer` overlay

**Files:**
- Create: `apps/web/components/planet/PlanetCompletionCheer.tsx`
- Create: `apps/web/components/planet/PlanetCompletionCheer.module.css`
- Test: `apps/web/components/planet/PlanetCompletionCheer.test.tsx`

**Interfaces:**
- Produces: `PlanetCompletionCheer(props: { title: string; body: string; onDismiss(): void; autoDismissMs?: number })`.
- Default `autoDismissMs = 4000`. Role: `dialog` with `aria-labelledby` / `aria-describedby`. Primary button label exactly `Keep exploring`. Escape and the button call `onDismiss`. z-index `30`.

- [ ] **Step 1: Write the failing test**

Create `apps/web/components/planet/PlanetCompletionCheer.test.tsx`:

```tsx
// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { PlanetCompletionCheer } from "./PlanetCompletionCheer";

beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { cleanup(); vi.useRealTimers(); });

it("shows the title, body, and Keep exploring control", () => {
  render(<PlanetCompletionCheer title="You did it!" body="All four Science lands explored — you're a Science explorer!" onDismiss={vi.fn()} />);
  expect(screen.getByRole("dialog", { name: "You did it!" })).toBeTruthy();
  expect(screen.getByText("All four Science lands explored — you're a Science explorer!")).toBeTruthy();
  expect(screen.getByRole("button", { name: "Keep exploring" })).toBeTruthy();
});

it("dismisses on the button and on Escape", () => {
  const onDismiss = vi.fn();
  render(<PlanetCompletionCheer title="You did it!" body="Body" onDismiss={onDismiss} />);
  fireEvent.click(screen.getByRole("button", { name: "Keep exploring" }));
  expect(onDismiss).toHaveBeenCalledTimes(1);
  onDismiss.mockClear();
  render(<PlanetCompletionCheer title="You did it!" body="Body" onDismiss={onDismiss} />);
  fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
  expect(onDismiss).toHaveBeenCalledTimes(1);
});

it("auto-dismisses after autoDismissMs", () => {
  const onDismiss = vi.fn();
  render(<PlanetCompletionCheer title="You did it!" body="Body" onDismiss={onDismiss} autoDismissMs={4000} />);
  act(() => { vi.advanceTimersByTime(3999); });
  expect(onDismiss).not.toHaveBeenCalled();
  act(() => { vi.advanceTimersByTime(1); });
  expect(onDismiss).toHaveBeenCalledTimes(1);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run components/planet/PlanetCompletionCheer.test.tsx`  
Expected: FAIL, cannot resolve `./PlanetCompletionCheer`.

- [ ] **Step 3: Implement the component + CSS**

`PlanetCompletionCheer.tsx`:

```tsx
"use client";

import { useEffect, useId, useRef } from "react";
import styles from "./PlanetCompletionCheer.module.css";

export type PlanetCompletionCheerProps = {
  title: string;
  body: string;
  onDismiss(): void;
  autoDismissMs?: number;
};

export function PlanetCompletionCheer({ title, body, onDismiss, autoDismissMs = 4000 }: PlanetCompletionCheerProps) {
  const titleId = useId();
  const bodyId = useId();
  const dismiss = useRef(onDismiss);
  dismiss.current = onDismiss;

  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const button = document.getElementById("planet-completion-cheer-dismiss") as HTMLButtonElement | null;
    button?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); dismiss.current(); }
    };
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("keydown", onKey, true);
      if (previous?.isConnected) previous.focus();
    };
  }, []);

  useEffect(() => {
    if (autoDismissMs <= 0) return;
    const id = window.setTimeout(() => dismiss.current(), autoDismissMs);
    return () => window.clearTimeout(id);
  }, [autoDismissMs]);

  return <div className={styles.overlay} role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={bodyId}>
    <div className={styles.card}>
      <div className={styles.stars} aria-hidden="true">
        <span /><span /><span /><span /><span />
      </div>
      <h2 id={titleId}>{title}</h2>
      <p id={bodyId}>{body}</p>
      <button id="planet-completion-cheer-dismiss" className={styles.dismiss} type="button" onClick={onDismiss}>Keep exploring</button>
    </div>
  </div>;
}
```

`PlanetCompletionCheer.module.css` — full-bleed `#100d20cc` backdrop, `z-index: 30`, centered cream card, five CSS star spans (yellow), motion off under `prefers-reduced-motion: reduce`. Keep styles compact; match Wiggle cream/navy tones (`#fff0d4`, `#342c43`, `#ffd991`).

- [ ] **Step 4: Run tests — expect PASS**

Run: `npx vitest run components/planet/PlanetCompletionCheer.test.tsx`

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/planet/PlanetCompletionCheer.tsx apps/web/components/planet/PlanetCompletionCheer.module.css apps/web/components/planet/PlanetCompletionCheer.test.tsx
git commit -m "feat: add shared planet completion cheer overlay"
```

---

### Task 2: Science HUD completion chrome

**Files:**
- Modify: `apps/web/components/science/ScienceHud.tsx`
- Create: `apps/web/components/science/ScienceHud.test.tsx`
- Modify: `apps/web/components/science/sciencePlanet.module.css`
- Modify: `apps/web/components/science/ScienceFallback.tsx` / tests only if props break (pass `completedZones={new Set()}` if required)

**Interfaces:**
- Produces: `ScienceHudProps.completedZones: ReadonlySet<ScienceZoneId>` (required; callers pass empty set when none).
- Status text: `{n} of 4 lands complete` using `SCIENCE_ZONES.length`.

- [ ] **Step 1: Write failing HUD tests**

Create `ScienceHud.test.tsx` modeled on `MathHud.test.tsx`:

```tsx
// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { ScienceHud } from "./ScienceHud";

afterEach(cleanup);

const base = {
  selectedZone: "animals" as const,
  onZoneSelect: vi.fn(),
  onBackToWorlds: vi.fn(),
  onStartMagnetLab: vi.fn(),
  onExplore: vi.fn(),
};

it("shows 0 of 4 lands complete with no badges", () => {
  render(<ScienceHud {...base} completedZones={new Set()} />);
  expect(screen.getByRole("status").textContent).toContain("0 of 4 lands complete");
  expect(screen.queryByText("Complete")).toBeNull();
});

it("badges completed lands and counts them", () => {
  render(<ScienceHud {...base} completedZones={new Set(["animals", "magnet-lab"])} />);
  expect(screen.getByRole("status").textContent).toContain("2 of 4 lands complete");
  const animals = screen.getByRole("button", { name: "Visit Animal Types" });
  expect(within(animals).getAllByText("Complete").length).toBeGreaterThan(0);
});
```

- [ ] **Step 2: Run — expect FAIL** (prop / text missing)

Run: `npx vitest run components/science/ScienceHud.test.tsx`

- [ ] **Step 3: Implement HUD + CSS**

Update `ScienceHud.tsx` to accept `completedZones`, map `SCIENCE_ZONES` like MathHud (badge + `aria-describedby` + screen-reader span), and add under the zone card:

```tsx
<p className={completedCount === 0 ? `${styles.completionStatus} ${styles.quiet}` : styles.completionStatus} role="status" aria-live="polite">
  {completedCount} of {SCIENCE_ZONES.length} lands complete
</p>
```

Copy `.completeBadge`, `.screenReaderOnly`, and `.quiet` patterns from `mathPlanet.module.css` into `sciencePlanet.module.css` (adapt selectors for `.topicButton` / `.zoneCard` / `.spaceHud` as needed). Keep existing `completionMessage` prop for the one-off return line **or** replace it with canvas-owned return announcement — prefer keeping a separate return line on the canvas (Task 4) and leave `completionMessage` optional for fallbacks.

Update `ScienceFallback` / canvas callers to pass `completedZones={new Set()}` until Task 4 wires the real set.

- [ ] **Step 4: Run tests — PASS; fix any ScienceFallback / canvas type errors**

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/science/ScienceHud.tsx apps/web/components/science/ScienceHud.test.tsx apps/web/components/science/sciencePlanet.module.css apps/web/components/science/ScienceFallback.tsx apps/web/components/science/SciencePlanetCanvas.tsx
git commit -m "feat: show Science land Complete badges and N of 4 progress"
```

(Only stage files that actually changed.)

---

### Task 3: `ScienceHandSession` notifies on complete

**Files:**
- Modify: `apps/web/components/science/ScienceHandSession.tsx`
- Modify: `apps/web/components/science/ScienceHandSession.test.tsx`

**Interfaces:**
- Produces: optional `onComplete?(land: StarterLand): void` — called **once** when `state.phase` becomes `"done"` (including resume-as-done on mount).

- [ ] **Step 1: Extend tests**

In `ScienceHandSession.test.tsx`, add (adapt to existing harness):

```tsx
it("notifies onComplete once when the land is finished", () => {
  const onComplete = vi.fn();
  // open animals with progress already fully matched/observed so phase is done, OR play through to done
  // assert onComplete called once with "animals"
});
```

Follow the file’s existing play-through helpers; assert a second celebrate/re-render does not call again.

- [ ] **Step 2: Run — FAIL** (prop unused)

- [ ] **Step 3: Implement**

```tsx
export type ScienceHandSessionProps = {
  land: StarterLand;
  progress: StarterProgress;
  onProgress(next: StarterProgress): void;
  onClose(): void;
  onComplete?(land: StarterLand): void;
};
```

Inside the component:

```tsx
  const complete = useRef(onComplete);
  complete.current = onComplete;
  const notified = useRef(false);
  useEffect(() => {
    if (state.phase !== "done" || notified.current) return;
    notified.current = true;
    complete.current?.(land);
  }, [state.phase, land]);
```

- [ ] **Step 4: Run tests — PASS**

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/science/ScienceHandSession.tsx apps/web/components/science/ScienceHandSession.test.tsx
git commit -m "feat: notify when a Science bench land is finished"
```

---

### Task 4: Wire Science planet completion + cheer

**Files:**
- Modify: `apps/web/components/science/SciencePlanetCanvas.tsx`
- Modify: `apps/web/components/science/SciencePlanetCanvas.test.tsx` (extend)

**Interfaces:**
- Replaces boolean `completed` with `completedZones: ReadonlySet<ScienceZoneId>`.
- `completeZone(id)` adds to set; sets return message `Wonderful exploring! {name} complete.`; if `size === 4` and cheer not yet shown, set `pendingCheer = true`.
- When `session` becomes `null` and `pendingCheer`, show `<PlanetCompletionCheer title="You did it!" body="All four Science lands explored — you're a Science explorer!" onDismiss={...} />` and mark cheer shown.

- [ ] **Step 1: Write / extend canvas tests**

Assert:
1. Completing Magnet alone → “1 of 4 lands complete”, no cheer dialog.
2. Completing four distinct zones (simulate via exposed complete path or by finishing sessions with mocks) then closing the last session → cheer dialog appears once.
3. Dismissing cheer removes it; does not reappear on re-render.

Use existing `SciencePlanetCanvas.test.tsx` patterns (visit / explore / session mocks). If Magnet-only path is easiest for unit tests, call `onComplete` from the Magnet mission mock four times with different zone ids by driving `completeZone` through UI: finish Magnet, then open each bench with progress already `done` if the harness supports it — or export a thin test helper. Prefer testing through public UI; if blocked, add a focused unit on a small `queuePlanetCheer(prevSize, nextSize, cheerShown)` pure helper in the same commit (only if needed).

Minimal pure helper (optional, only if canvas tests are too brittle):

```ts
// planetCheerGate.ts
export function shouldQueueCheer(previousCount: number, nextCount: number, cheerShown: boolean): boolean {
  return !cheerShown && previousCount < 4 && nextCount >= 4;
}
```

- [ ] **Step 2: Implement canvas wiring**

Replace:

```tsx
const [completed, setCompleted] = useState(false);
// ...
completionMessage={completed ? "Wonderful exploring! Magnet Lab complete." : props.completionMessage}
// Magnet onComplete={() => setCompleted(true)}
```

With:

```tsx
const [completedZones, setCompletedZones] = useState<ReadonlySet<ScienceZoneId>>(() => new Set());
const [returnMessage, setReturnMessage] = useState(props.completionMessage ?? "");
const [showCheer, setShowCheer] = useState(false);
const cheerShown = useRef(false);
const pendingCheer = useRef(false);

const completeZone = useCallback((id: ScienceZoneId) => {
  setCompletedZones((previous) => {
    if (previous.has(id)) return previous;
    const next = new Set(previous).add(id);
    if (!cheerShown.current && next.size >= 4) pendingCheer.current = true;
    return next;
  });
  setReturnMessage(`Wonderful exploring! ${scienceLand(id).name} complete.`);
}, []);

const close = useCallback(() => {
  // existing close body...
  setSession(null);
  // ...existing restore...
  if (pendingCheer.current && !cheerShown.current) {
    pendingCheer.current = false;
    cheerShown.current = true;
    setShowCheer(true);
  }
  props.onSessionOpenChange?.(false);
}, [nearby, props]);
```

Pass `completedZones` into `ScienceHud`. Magnet: `onComplete={() => completeZone("magnet-lab")}`. Bench: `onComplete={completeZone}`. Render cheer sibling when `showCheer`.

Also show `returnMessage` via `completionMessage` prop on HUD or a status line like Numeria’s `returnAnnouncement`.

- [ ] **Step 3: Run Science planet + hand session tests — PASS**

Run:

```bash
npx vitest run components/science/SciencePlanetCanvas.test.tsx components/science/ScienceHud.test.tsx components/science/ScienceHandSession.test.tsx
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/components/science/SciencePlanetCanvas.tsx apps/web/components/science/SciencePlanetCanvas.test.tsx
git commit -m "feat: track Science land completion and cheer when all four are done"
```

---

### Task 5: Numeria all-four cheer

**Files:**
- Modify: `apps/web/components/math/MathPlanetCanvas.tsx`
- Modify: `apps/web/components/math/MathPlanetCanvas.test.tsx`

**Interfaces:**
- When `completeRegion` / Fraction Forest `missionCompleted` grows the set to 4, set `pendingCheer`. On `closeSession` / `hideMission` after that, show `PlanetCompletionCheer` with Numeria copy once.

- [ ] **Step 1: Extend tests**

Add a test that marks all four regions complete (drive `onComplete` for three hand regions + Fraction Forest mission complete if already covered, or set state via finishing flows). After the last session closes, expect the dialog with body `All four Numeria regions explored — you're a Numeria explorer!`. Assert it appears only once.

- [ ] **Step 2: Implement**

Mirror Science’s `pendingCheer` / `cheerShown` / `showCheer` in `MathPlanetCanvas`. Trigger pending when `setCompletedRegions` yields `size >= 4`. On `closeSession` and on Fraction Forest `hideMission` when the set is already 4 and pending, open the cheer.

Copy constants:

```ts
const CHEER_TITLE = "You did it!";
const CHEER_BODY = "All four Numeria regions explored — you're a Numeria explorer!";
```

- [ ] **Step 3: Run math canvas tests — PASS**

Run: `npx vitest run components/math/MathPlanetCanvas.test.tsx`

- [ ] **Step 4: Commit**

```bash
git add apps/web/components/math/MathPlanetCanvas.tsx apps/web/components/math/MathPlanetCanvas.test.tsx
git commit -m "feat: cheer when all four Numeria regions are complete this visit"
```

---

### Task 6: design-qa record

**Files:**
- Modify: `design-qa.md`

- [ ] **Step 1: Add section**

```markdown
## Planet completion cheer — <date>

result: automated checks pass; visual check is <confirmed | not yet checked>.

Science Planet now shows Numeria-style “N of 4 lands complete” and Complete badges. Finishing all four Science lands or all four Numeria regions in one visit opens a shared full-screen star cheer after the session closes (this visit only).

Checked: <N> unit files covering `PlanetCompletionCheer`, `ScienceHud`, Science/Numeria canvas wiring, and `ScienceHandSession` onComplete. Visual: cheer overlay and Science badges at desktop / ~390 px <confirmed | pending>.

Not verifiable automatically: how motivating the cheer feels — judgment call. Persistence and constellation unlocks remain Phase 5.
```

- [ ] **Step 2: Commit**

```bash
git add design-qa.md
git commit -m "docs: record the planet completion cheer verification"
```

Do not push unless the owner asks.

---

## Self-review

- **Spec coverage:** shared cheer (Task 1); Science badges + count (Task 2); bench `onComplete` (Task 3); Science canvas + cheer gate (Task 4); Numeria cheer (Task 5); design-qa (Task 6). Persistence / Magnet redesign / constellation out of scope.
- **Type consistency:** `ScienceZoneId` / `StarterLand` / cheer props match across tasks; cheer shown only after session close.
- **Placeholders:** none — copy and behaviour are concrete. Canvas test strategy allows an optional pure `shouldQueueCheer` if UI simulation is brittle.
