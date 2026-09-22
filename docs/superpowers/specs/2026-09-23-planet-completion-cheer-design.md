# Planet Completion Cheer Design (Phase 2)

## Goal

When a kid finishes all four lands on Science Planet or all four regions on Numeria in this visit, celebrate them with a short full-screen star cheer. Science also gains Numeria-style “N of 4” progress and Complete badges on each finished land so both planets feel the same.

## Roadmap context

| Phase | What |
| --- | --- |
| 1 | Shared shell: gesture coaching + layout (done / PR) |
| **2 (this spec)** | Completion parity + full-screen star cheer (this visit only) |
| 3 | Migrate Magnet Lands onto `HandActivityShell` |
| 4 | Redesign Magnet’s 3D mechanics |
| 5 | Constellation unlocks (Twin / API) |

## Decisions

Chosen by the product owner (earlier brainstorming).

- **Where the cheer shows:** Both — a short in-session cheer when a land/region finishes, then a planet-level full-screen star cheer when the **4th** finishes this visit.
- **Planet chrome:** Like Numeria today — “N of 4 … complete” plus a Complete badge on each finished pill; Science gets this; Numeria already has it.
- **Persistence:** This visit only. Refresh or leaving the planet resets completion tracking until Phase 5.
- **Parity:** Science and Numeria use the same cheer overlay and the same completion UX language.

## Scope

**In scope:**

- `SciencePlanetCanvas` / `ScienceHud`: track `completedZones: ReadonlySet<ScienceZoneId>` for all four lands (`magnet-lab`, `animals`, `colors`, `life-cycle`); show “N of 4 lands complete”; Complete badge on finished topic pills; per-land return message (e.g. “Wonderful exploring! Animal Types complete.”).
- Wire bench lands: `ScienceHandSession` calls `onComplete(land)` once when phase becomes `done` (mirror `MathHandSession` / Magnet’s existing `onComplete`).
- Magnet Lands: keep calling the canvas `onComplete` so Magnet counts toward the four.
- Shared `PlanetCompletionCheer` overlay (stars + congrats copy + dismiss / short auto-dismiss): shown when the set grows to size 4; Science copy “Science explorer!” / Numeria copy “Numeria explorer!” (or equivalent kid-clear wording).
- Numeria: when `completedRegions` reaches 4, show the same overlay (HUD badges already exist).
- Unit tests for Science HUD completion chrome, canvas wiring (4th land triggers cheer), Numeria 4th-region cheer, and `ScienceHandSession` `onComplete` once.

**Out of scope:**

- Twin / constellation API unlocks (Phase 5).
- Persisting completion across reloads.
- Magnet → `HandActivityShell` migration or Magnet 3D redesign (Phases 3–4).
- Changing Fraction Forest’s API mission completion path beyond counting it in the set (already sets Fraction Forest complete today).

## Current state

- **Numeria:** `MathPlanetCanvas` keeps `completedRegions`; `MathHud` shows Complete badges and “N of 4 regions complete”; `MathHandSession` / Fraction Forest mission call `completeRegion`. No full-screen all-four cheer.
- **Science:** Only Magnet Lab sets a boolean `completed` and a one-off completion message. Bench lands (`ScienceHandSession`) update `StarterProgress` but never notify the planet that the land is finished. Topic pills have no Complete badge; there is no “N of 4 lands complete” line.
- Session overlays already use fixed full-viewport layers (`magnetOverlay` / `handOverlay` at z-index 20). The cheer should sit above the planet HUD (e.g. z-index 30) and below or equal to an open session only if shown after the session closes — preferred: show the cheer **after** the session closes / when returning to the planet, so it is not buried under the camera frame.

## Architecture

| Unit | Purpose | Depends on |
| --- | --- | --- |
| `components/planet/PlanetCompletionCheer.tsx` (new) | Accessible dialog/overlay: star visuals (CSS), title, short message, primary dismiss control; optional auto-dismiss after ~4s; `prefers-reduced-motion` skips sparkle motion. | CSS module |
| `components/planet/PlanetCompletionCheer.module.css` (new) | Full-bleed dimmed backdrop, centered card, simple star shapes. | — |
| `ScienceHud.tsx` (modified) | Accept `completedZones`; render Complete badges + “N of 4 lands complete” (mirror MathHud a11y: `aria-describedby` + screen-reader “Complete”). | `SCIENCE_ZONES` / land ids |
| `SciencePlanetCanvas.tsx` (modified) | Own `completedZones` set; `completeZone(id)` adds to set, sets return message, and if size becomes 4 queues the cheer for when `session === null`. | `ScienceHud`, `PlanetCompletionCheer`, sessions |
| `ScienceHandSession.tsx` (modified) | Optional `onComplete(land)` fired once when entering `done` (ref-guard like Math). | — |
| `MathPlanetCanvas.tsx` (modified) | When `completedRegions.size` becomes 4 and no session is open (or on next close), show `PlanetCompletionCheer` for Numeria. | `PlanetCompletionCheer` |

## Behaviour

1. **Mark complete:** When Magnet finishes, or a Science bench reaches `done`, or a Numeria region / Fraction Forest mission completes, add that id to the visit’s set (idempotent).
2. **Per-land message:** On return to the planet HUD, show a polite status line for the land just finished (Science currently only does this for Magnet).
3. **All four:** The first time the set size reaches 4 in this visit, after the finishing session has closed, present `PlanetCompletionCheer`. Dismiss (button or Escape) returns focus to the planet HUD. Completing the same four again in one visit does not re-show the cheer (a `cheerShown` ref).
4. **In-session:** Keep existing per-activity celebrate sound / “You did it!” coach lines; do not open the full-screen cheer while the camera session is still mounted.

## Copy (kid-facing)

- Science status: `{n} of 4 lands complete`
- Badge: `Complete` (same as Numeria)
- Cheer title (Science): `You did it!`
- Cheer body (Science): `All four Science lands explored — you're a Science explorer!`
- Cheer title (Numeria): `You did it!`
- Cheer body (Numeria): `All four Numeria regions explored — you're a Numeria explorer!`
- Cheer button: `Keep exploring`

## Testing

- `ScienceHud`: with 0 / 2 / 4 completed zones, assert count text and badges.
- `SciencePlanetCanvas`: finishing the fourth distinct land (simulated) shows the cheer after session close; third does not.
- `ScienceHandSession`: `onComplete` called once when done.
- `MathPlanetCanvas`: when four regions are in the set and the last session closes, cheer appears once.
- Existing Math/Science session tests still pass.

## Success criteria

- Science HUD matches Numeria’s completion language (count + badges).
- Finishing the fourth land/region this visit shows one clear, motivating full-screen star cheer after the session closes.
- Refresh clears progress (no false “already complete” state).
- Magnet Lands and constellation unlocks remain unchanged beyond counting Magnet toward the four.
