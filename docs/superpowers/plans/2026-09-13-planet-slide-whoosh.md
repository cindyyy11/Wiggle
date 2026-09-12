# Planet Slide Whoosh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Play a louder synthesized whoosh when the subject-world carousel successfully slides to another planet.

**Architecture:** Extend the existing Web Audio hook with a dedicated `slideWhoosh` cue (same noise whoosh as `whoosh`, peak gain `0.14`). Call it from `SubjectWorlds.slide` only when the clamped next world differs from the current selection. Mute and AudioContext failure stay best-effort and non-blocking.

**Tech Stack:** Next.js (apps/web), React, TypeScript, Vitest, React Testing Library, Web Audio API.

**Spec:** `docs/superpowers/specs/2026-09-13-planet-slide-whoosh-design.md`

## Global Constraints

- Synthesized Web Audio only — no audio files or new dependencies.
- Do not change universe / landmark `whoosh` peak gain (`0.05`) or character.
- Respect existing mute key `wiggle:muted`; muted playback must be a no-op.
- Sound failures must never throw or block navigation / slide UI.
- Play only when the selected planet actually changes; no sound at carousel ends.
- Out of scope: new mute UI, ambient soundscapes, mission/magnet cue changes.

## File Structure

- `apps/web/features/audio/useWiggleSound.ts` — add `slideWhoosh` name + louder whoosh playback.
- `apps/web/features/audio/useWiggleSound.test.ts` — assert the new cue plays without throwing.
- `apps/web/components/worlds/SubjectWorlds.tsx` — play `slideWhoosh` inside `slide` on real selection change.
- `apps/web/components/worlds/SubjectWorlds.test.tsx` — mock `useWiggleSound` and assert play / no-play cases.
- `docs/superpowers/specs/2026-09-13-planet-slide-whoosh-design.md` — already written; commit with Task 1 if not yet committed.

---

### Task 1: Add `slideWhoosh` to `useWiggleSound`

**Files:**
- Modify: `apps/web/features/audio/useWiggleSound.ts`
- Modify: `apps/web/features/audio/useWiggleSound.test.ts`
- Commit (if untracked): `docs/superpowers/specs/2026-09-13-planet-slide-whoosh-design.md`

**Interfaces:**
- Produces:
  ```ts
  export type WiggleSoundName =
    | "missionStart"
    | "correct"
    | "tryAgain"
    | "whoosh"
    | "slideWhoosh"
    | "constellationUnlock"
    | "celebrate"
    | "magnetPull"
    | "magnetStay";
  ```
- Consumes: existing `tone` helpers / AudioContext lifecycle in the same file.
- Consumed by Task 2 via `play("slideWhoosh")`.

- [ ] **Step 1: Write the failing test for `slideWhoosh`**

In `apps/web/features/audio/useWiggleSound.test.ts`, extend the magnet cue test (or add a sibling) so it also exercises `slideWhoosh`:

```ts
it("exposes unlock and plays magnet and slide whoosh effects without throwing", () => {
  const { result } = renderHook(() => useWiggleSound());
  expect(() => act(() => result.current.unlock())).not.toThrow();
  expect(() => act(() => result.current.play("magnetPull"))).not.toThrow();
  expect(() => act(() => result.current.play("magnetStay"))).not.toThrow();
  expect(() => act(() => result.current.play("slideWhoosh"))).not.toThrow();
});
```

Rename the existing magnet-only test title to match, or keep that test and add this assertion in a new `it(...)` — prefer updating the existing magnet test title + body so the suite stays small.

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
npm test --workspace=apps/web -- features/audio/useWiggleSound.test.ts
```

Expected: FAIL because `"slideWhoosh"` is not assignable to `WiggleSoundName` and/or is not handled by `play`.

- [ ] **Step 3: Implement `slideWhoosh`**

In `apps/web/features/audio/useWiggleSound.ts`:

1. Add `"slideWhoosh"` to `WiggleSoundName`.
2. Change `playWhoosh` to accept an optional peak gain (default `0.05` so existing callers stay identical):

```ts
function playWhoosh(context: AudioContext, peakGain = 0.05) {
  const bufferSize = context.sampleRate * 0.4;
  const buffer = context.createBuffer(1, bufferSize, context.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
  const source = context.createBufferSource();
  source.buffer = buffer;
  const filter = context.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.setValueAtTime(600, context.currentTime);
  filter.frequency.exponentialRampToValueAtTime(1800, context.currentTime + 0.35);
  const gain = context.createGain();
  gain.gain.setValueAtTime(peakGain, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.4);
  source.connect(filter).connect(gain).connect(context.destination);
  source.start();
}
```

3. Update the `SEQUENCES` exclude union and `play` dispatch so `slideWhoosh` is handled beside `whoosh`:

```ts
const SEQUENCES: Readonly<Record<Exclude<WiggleSoundName, "whoosh" | "slideWhoosh" | "magnetPull" | "magnetStay">, (context: AudioContext) => void>> = {
  // unchanged entries
};

const play = useCallback((name: WiggleSoundName) => {
  if (muted || typeof window === "undefined") return;
  try {
    context.current ??= new AudioContext();
    if (context.current.state === "suspended") void context.current.resume();
    if (name === "whoosh") playWhoosh(context.current);
    else if (name === "slideWhoosh") playWhoosh(context.current, 0.14);
    else if (name === "magnetPull") playMagnetPull(context.current);
    else if (name === "magnetStay") playMagnetStay(context.current);
    else SEQUENCES[name](context.current);
  } catch { /* Sound is a nice-to-have, never a requirement to proceed. */ }
}, [muted]);
```

Do not change any other cue gains.

- [ ] **Step 4: Run the audio tests to verify they pass**

Run:

```bash
npm test --workspace=apps/web -- features/audio/useWiggleSound.test.ts
```

Expected: PASS (all tests in that file).

- [ ] **Step 5: Commit**

```bash
git add apps/web/features/audio/useWiggleSound.ts apps/web/features/audio/useWiggleSound.test.ts docs/superpowers/specs/2026-09-13-planet-slide-whoosh-design.md
git commit -m "$(cat <<'EOF'
feat(audio): add louder slideWhoosh cue for planet carousel

EOF
)"
```

On Windows PowerShell, if heredoc is unavailable, use an equivalent multi-line `git commit -m` that preserves the same message text. Only stage the paths listed above.

---

### Task 2: Play `slideWhoosh` when the planet carousel actually moves

**Files:**
- Modify: `apps/web/components/worlds/SubjectWorlds.tsx`
- Modify: `apps/web/components/worlds/SubjectWorlds.test.tsx`

**Interfaces:**
- Consumes: `useWiggleSound()` → `{ play: (name: WiggleSoundName) => void }` from Task 1, calling `play("slideWhoosh")`.
- Produces: `slide(direction: number)` plays sound iff selection changes; swipe and arrow UI already call this same function.

- [ ] **Step 1: Write the failing SubjectWorlds sound tests**

In `apps/web/components/worlds/SubjectWorlds.test.tsx`, add a hoisted play mock and mock the audio hook near the existing mocks:

```ts
const soundPlay = vi.hoisted(() => vi.fn());

vi.mock("../../features/audio/useWiggleSound", () => ({
  useWiggleSound: () => ({
    play: soundPlay,
    unlock: () => undefined,
    muted: false,
    setMuted: () => undefined,
  }),
}));
```

Clear the spy in `afterEach`:

```ts
afterEach(() => {
  vi.useRealTimers();
  cleanup();
  window.history.replaceState({}, "", "/");
  soundPlay.mockClear();
});
```

Add this test (keep the existing slide test; this one focuses on sound):

```ts
it("plays slideWhoosh only when the selected planet actually changes", () => {
  vi.useFakeTimers();
  render(<SubjectWorlds initialRoute={{ world: null }} quality="fallback" />);
  enterWorlds();
  soundPlay.mockClear();

  fireEvent.click(screen.getByRole("button", { name: "Next planet" }));
  expect(screen.getByRole("heading", { name: "Science Planet" })).toBeTruthy();
  expect(soundPlay).toHaveBeenCalledWith("slideWhoosh");
  expect(soundPlay).toHaveBeenCalledTimes(1);

  // Jump to last planet via tab, then swipe past the end — slide is called but selection does not change.
  fireEvent.click(screen.getByRole("button", { name: "Show English" }));
  soundPlay.mockClear();
  const layer = screen.getByTestId("mock-constellation").parentElement!;
  fireEvent.pointerDown(layer, { button: 0, clientX: 200, clientY: 100 });
  fireEvent.pointerUp(layer, { button: 0, clientX: 100, clientY: 100 });
  expect(screen.getByRole("heading", { name: "English" })).toBeTruthy();
  expect(soundPlay).not.toHaveBeenCalled();
});
```

Notes for the implementer:

- Arrow `Next planet` is disabled on English, so the end-of-carousel no-sound case must use a swipe on the constellation layer (same `slide(1)` path).
- `mock-constellation`'s parent is the `constellationLayer` div that owns the pointer handlers in `SubjectWorlds`.
- Swipe left (`clientX` decreases by > 35) calls `slide(1)`.

- [ ] **Step 2: Run the new test to verify it fails**

Run:

```bash
npm test --workspace=apps/web -- components/worlds/SubjectWorlds.test.tsx
```

Expected: FAIL because `soundPlay` is never called with `"slideWhoosh"` (or the mock import path is unused until Step 3).

- [ ] **Step 3: Wire sound into `slide`**

In `apps/web/components/worlds/SubjectWorlds.tsx`:

1. Import and call the hook:

```ts
import { useWiggleSound } from "../../features/audio/useWiggleSound";
```

Inside `SubjectWorlds`:

```ts
const sound = useWiggleSound();
```

2. Replace the current `slide` implementation with a change-gated version:

```ts
const slide = (direction: number) => {
  setSelectedWorld(world => {
    const next = order[Math.max(0, Math.min(order.length - 1, order.indexOf(world) + direction))];
    if (next !== world) sound.play("slideWhoosh");
    return next;
  });
  setStatusMessage("");
};
```

Keep swipe handlers and `WorldSelector` `onSlide={slide}` unchanged — they already funnel through `slide`.

Do not play sound from `onChoose` / planet tabs; only from `slide`.

- [ ] **Step 4: Run SubjectWorlds tests to verify they pass**

Run:

```bash
npm test --workspace=apps/web -- components/worlds/SubjectWorlds.test.tsx
```

Expected: PASS (including the new sound test and the existing slide test).

- [ ] **Step 5: Manual sanity check against the running dev server**

With `npm run dev` already running for `apps/web`: open the worlds hub, unmute if needed, slide with arrows and swipe. Confirm one louder whoosh per successful change, silence at the ends, and that entering Numeria / Science does not use `slideWhoosh`.

- [ ] **Step 6: Commit**

```bash
git add apps/web/components/worlds/SubjectWorlds.tsx apps/web/components/worlds/SubjectWorlds.test.tsx
git commit -m "$(cat <<'EOF'
feat(worlds): play slideWhoosh when carousel planet changes

EOF
)"
```

---

## Self-Review

| Spec requirement | Task |
|---|---|
| Dedicated louder `slideWhoosh` (gain `0.14`) | Task 1 |
| Universe `whoosh` unchanged at `0.05` | Task 1 (`playWhoosh` default) |
| Play from `SubjectWorlds.slide` on real change only | Task 2 |
| Swipe and arrows both covered via shared `slide` | Task 2 |
| Mute / AudioContext failure best-effort | Task 1 (existing path) |
| Focused unit tests | Tasks 1–2 |
| No new mute UI / assets / other cues | Global Constraints + out of scope |

No placeholders found. Interface names (`slideWhoosh`, `play`, `slide`) are consistent across tasks.
