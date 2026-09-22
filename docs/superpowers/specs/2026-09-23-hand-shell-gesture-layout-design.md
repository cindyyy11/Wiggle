# Hand Shell Gesture Coaching & Layout Design (Phase 1)

## Goal

Make camera-first hand activities easier for kids to play: tell them clearly which hand gesture to use, nudge them when they use the wrong one, and stop the top mission card from covering the workbench. Changes live in the shared `HandActivityShell` so Science benches, Numeria regions, and (in a later phase) Magnet Lands all benefit.

## Roadmap (agreed, not all in this phase)

| Phase | What |
| --- | --- |
| **1 (this spec)** | Shared shell: gesture coaching + smaller top card / workbench safe padding |
| 2 | Completion parity: Science “N of 4” badges + full-screen star cheer on Science and Numeria (this visit only) |
| 3 | Migrate Magnet Lands onto `HandActivityShell` (same chrome; keep current magnet gameplay) |
| 4 | Redesign Magnet’s 3D mechanics |
| 5 | Constellation unlocks when lands finish (Twin / API) |

## Decisions

Chosen by the product owner.

- **Approach:** Extend the existing shared shell; do not rebuild session chrome from scratch.
- **Layout:** Keep the mission card at the top; shrink it and add workbench safe padding so content stays visible (option B).
- **Gesture coaching:** All three — stronger copy, a small on-screen gesture hint, and a wrong-gesture nudge.
- **Parity:** Numeria and Science should feel the same for coaching/layout; later phases bring celebration and Magnet onto the same path.
- **Persistence (Phase 2+):** Completion celebrations are this-visit only until Phase 5.

## Scope

**In scope (Phase 1):**

- Stronger discover/match instruction and coach copy in `ScienceHandSession`, `MathHandSession` (and any shell-level defaults), aligned with real gestures: discover → **point**; match → **pinch** then **open palm**.
- A small gesture hint in the “Your Hand” card (point vs pinch/palm), driven by phase.
- A one-shot wrong-gesture nudge from Wiggle when the kid uses the wrong gesture for the current phase (e.g. pinch while discovering, or point when a pinch-grab is expected) — tip only, does not block play.
- CSS on `magnetLab.module.css` (shared by `HandActivityShell`): tighter `.missionCard`, top safe padding / clearance on `.workbench` so hero props and targets are not under the card on desktop and mobile.

**Out of scope (Phase 1):**

- Science “N of 4” / Complete badges and full-screen star cheer (Phase 2).
- Migrating Magnet Lands onto `HandActivityShell` (Phase 3).
- Redesigning Magnet’s 3D mechanics (Phase 4).
- Constellation / Twin API unlocks (Phase 5).
- Changing gesture detection thresholds or the discover/match state machines beyond surfacing better coaching.

## Current state

- `HandActivityShell` (`apps/web/components/handActivity/HandActivityShell.tsx`) owns the camera backdrop, exit control, top mission card (`title` / `instruction` / progress / step), Wiggle coach bubble, workbench slot, and “Your Hand” card. Layout CSS: `apps/web/components/science/magnetLab.module.css`. Mission card and chrome sit at `z-index: 2` over the workbench at `z-index: 1`, so the card can cover 3D content.
- Discover/match for Science benches: `ScienceHandSession.tsx` — mission card already says “Point at each one…” / “Pinch to pick up…”, coach lines in the same file; live “Your Hand” tips from `handBenchFrame.ts` (`benchStatusForFrame`).
- Numeria regions use the same shell via `MathHandSession` / answer-hold flow; answer status copy lives in `handBenchFrame.ts` (`answerStatusForFrame`).
- Wrong gesture today is mostly ignored for coaching (controller simply does not advance); kids get little feedback that they should switch gesture.
- Magnet Lands still uses `MagnetLabMission` with the same CSS file but not `HandActivityShell` — Phase 3.

## Architecture

| Unit | Purpose | Depends on |
| --- | --- | --- |
| `handActivity/gestureCoach.ts` (new, pure) | Given phase + current gesture (+ optional “holding”), returns optional nudge line and which hint glyph to show (`point` \| `pinch` \| `open_palm` \| `none`). No React. | Gesture type from features/gestures |
| `HandActivityShell` (modified) | Renders gesture hint in “Your Hand”; accepts optional `gestureHint` / applies coach override when a nudge is active; keeps Escape/focus/camera behaviour unchanged. | `gestureCoach` (or props from parent) |
| `handBenchFrame.ts` / session parents (modified) | Discover/match (and Numeria hold) status strings use the stronger kid-facing wording; sessions pass phase into shell so hint + nudge stay in sync. | Existing bench controller |
| `magnetLab.module.css` (modified) | Smaller mission card; workbench top clearance; gesture-hint styles. | — |

## Gesture coaching behaviour

1. **Copy (always visible when camera ready):**
   - Discover: mission card and initial coach emphasize pointing the finger at each item to discover it.
   - Match: pinch to pick up; open palm over the home/target to place.
   - Numeria answer-hold: keep hold-over-answer wording, but align tone with the same kid-clear style.
2. **Hint:** A compact visual in “Your Hand” (CSS/simple SVG or existing mark pattern — no new asset pipeline) shows the expected gesture for the current phase. Updates when phase changes (discover → match → done).
3. **Wrong-gesture nudge:** When tracking is ready and the kid’s recognized gesture is wrong for the phase for a short dwell (reuse existing gesture dwell ideas where possible; do not invent a second controller), set the coach line once to a short tip (e.g. “Try pointing your finger to discover!”). Do not spam: at most one nudge per “wrong streak” until they switch to a correct gesture or the phase changes. Play continues normally.

## Layout behaviour

- Reduce `.missionCard` padding and title/body size slightly so the card is shorter.
- Add enough top inset/padding on `.workbench` (and/or mission padding) that the interactive bench volume sits below the card’s box on typical desktop and the stacked mobile layout still leaves a usable workbench (`min-height` preserved or improved, not worsened).
- Do not move the card to the side or auto-hide it in Phase 1.

## Testing

- Unit tests for `gestureCoach` (correct hint per phase; nudge when wrong; no nudge when right; reset after correct gesture / phase change).
- Session tests: discover/match instruction strings and coach nudge expectations where the shell is exercised today (`ScienceHandSession.test.tsx`, Numeria hand session tests as applicable).
- No requirement to screenshot-test layout; a short visual check on Science + Numeria hand sessions at desktop and ~390px wide is part of verification.

## Success criteria

- A kid opening Animal Types / Colors Canyon / Life Cycle Garden / a Numeria hand region sees clear “which gesture” guidance without reading code comments.
- Wrong gesture produces a friendly Wiggle tip, not a stuck silent failure.
- With the camera ready, workbench items and targets are not hidden under the top mission card on the viewports checked in verification.
- Magnet Lands gameplay and constellation unlocks are unchanged in Phase 1.
