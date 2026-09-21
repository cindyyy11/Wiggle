# Camera-First Science Lands Design

## Goal

Make Animal Types, Colors Canyon and Life Cycle Garden play like Magnet Lands: the camera opens as soon as the child enters, and the activity is played entirely with the hand on a custom 3D workbench, inside the same friendly frame (live camera backdrop, mission card, guide bubble, "Your Hand" card).

This is Round 1 of a larger effort. Numeria's three quiz regions (Round 2) and moving Magnet Lands onto the shared frame (Round 3) are separate specs.

## Decisions

These were chosen by the product owner during design.

- **Camera required.** If the camera cannot open (denied, unavailable, none), the child sees the Magnet-style "Ask an adult to turn on the camera" screen with **Try again**. There is no button or keyboard fallback for the activity itself.
- **Full custom 3D workbench per land**, not just a restyled frame.
- **Shared engine, per-land sets (approach A).** One frame, one hand-play engine, one 3D bench scene, and one self-contained 3D "set" per land.
- **Round 1 = the shared frame plus the three Science lands.**

## Scope

In scope: the shared camera-first frame, the shared hand-play engine and bench scene, and the three lands' 3D sets, wired into the Science Planet in place of the current starter session. Removal of the button and tap path for those lands, and of the tests that relied on it.

Out of scope: Numeria (Round 2). Moving Magnet Lands onto the shared frame (Round 3); Magnet Lands is untouched. New lesson content (the existing `SCIENCE_ACTIVITIES` items, facts, targets and matching rules stay the source of truth). Parent-space reporting changes. The five future Science zones.

## Current state

- Magnet Lands is camera-first (`MagnetLabMission`, `MagnetHandLabScene`, pure `magnetHandPlay`).
- Animal Types, Colors Canyon and Life Cycle Garden use `ScienceStarterSession`: the camera is off until turned on, and the lands also work with buttons. Their hand logic is `StarterHandController` in `scienceActivities.ts`. Their 3D is `ScienceActivityModels`, about 22 lines of coloured primitives.
- `SciencePlanetCanvas` opens sessions, keeps `StarterProgress` per land, and wraps sessions in `ScienceSessionFrame`.

## Learning flow

All three lands follow the curriculum they already have, hands only.

1. **Discover.** Items rest on the bench. Pointing a finger at an item lifts and highlights it and Wiggle says its `fact` (spoken if voice is unmuted). Each item counts once and a progress dot fills. When the last is found Wiggle says "Now let's match!" and the bench advances by itself after a short celebration.
2. **Match.** Pinching picks an item up and it follows the hand cursor. A target lights up when the held item is over it; opening the palm releases it. A correct drop settles the item on the target with a sparkle, Wiggle cheers and a dot fills. A wrong drop sends the item back to the bench and Wiggle repeats the existing "Try again" hint.
3. **Done.** When every item is matched there is a celebration and the land is marked complete through the existing `onProgress` flow. The "Back to Science Planet" button is available at all times.

Hand mapping follows Magnet Lab: the mirrored camera pointer is smoothed and clamped onto the bench, with generous hit radii. Losing the hand for 400 ms returns a held item gently to the bench and never scores an answer or releases one onto a target.

## Architecture

New folder `apps/web/components/handActivity/`, written so Round 2 can reuse it.

| Unit | Purpose | Depends on |
| --- | --- | --- |
| `HandActivityShell.tsx` | The frame. Starts `useHandTracking({ enabled: true })` on mount. Renders the camera backdrop video, mission card with progress dots, spoken guide bubble, "Your Hand" card, and the adult-help screen with Try again. Owns focus trap, Escape, focus return, reduced-motion detection and sound unlock. Renders its children with the hand data. | `useHandTracking`, `useWiggleSound`, voice preference |
| `handBenchPlay.ts` | Pure engine, no React or Three. `handPointerToBench`, `benchHit`, and a reducer over `{ phase, observed, matched, held }` for `observe`, `grab`, `drop`, `cancel`, `advance`. Takes the land's rules (items and `matchesActivity`). | `PointerNdc`, `scienceActivities` |
| `HandBenchScene.tsx` | Shared React Three Fiber scene: bench, glowing hand cursor, held item following the hand, hover highlight, wrong-drop shake, match sparkle. Reads the shared hand data every frame and feeds `handBenchPlay`. Renders whichever set it is given. | `handBenchPlay`, a `BenchSet` |
| `sets/AnimalSet.tsx`, `sets/ColorSet.tsx`, `sets/LifeCycleSet.tsx` | One self-contained 3D module per land: item models, target pads and scenery, with bench-coordinate positions. | `BenchSet` type only |
| `ScienceHandSession.tsx` (in `components/science/`) | Wires shell, scene and engine for one land from `SCIENCE_ACTIVITIES`; keeps the `StarterProgress` contract so the planet is unchanged. Replaces `ScienceStarterSession`. | all of the above |

A `BenchSet` is `{ land, items: { id, at, Model }[], targets: { id, at, Pad }[], Scenery }`, where `at` is a bench coordinate in 0..1 and each `Model`/`Pad` takes small presentation props (`held`, `hovered`, `matched`, `active`, `filled`). The engine only ever sees ids and coordinates, so it stays pure and unit-testable.

Data flow: camera, then `useHandTracking`, then the shared hand data, then `HandBenchScene` each frame, then `handBenchPlay`, then progress, coach lines and completion, then the existing planet state.

## The three sets

- **Animal Types.** Horse, frog, bird and fish toys; four habitat pads: meadow (Land), shore (Land + water), sky-and-tree (Air + land), pool (Water).
- **Colors Canyon.** Four symbol crystals (circle, triangle, square, diamond) and same-coloured, same-symbol pedestals.
- **Life Cycle Garden.** Seed, sprout and flower, and three numbered garden plots (1 First, 2 Next, 3 Then).

## Failure states and accessibility

- Camera not available: the adult-help screen with **Try again**, as in Magnet Lands. The activity is not playable without the camera.
- Tracking lost mid-activity: a "Show your hand" tip, no penalty, held item returns after the 400 ms grace.
- Reduced motion: bounce, shake and sparkle animations are toned down; the activity stays hand-controlled.
- Screen readers: the coach text is a live region. Escape and the exit button work and focus returns to the land's entry control. Keyboard-only and touch-only players cannot complete the activity itself; this follows from the camera-required decision.
- Camera frames and inference stay on the device, as elsewhere.

## Testing and verification

- **Unit (`handBenchPlay`):** each item is discovered once; the phase advances only when all are found; a correct drop scores; a wrong drop scores nothing and returns the item; losing tracking never scores or releases an answer; pointer mapping and hit-testing.
- **Component:** the shell with mocked camera states (starting, help, ready), Try again, Escape and focus. A session test per land plays discover, match and done with fake hand frames, mirroring the Magnet Lab mission tests.
- **Browser:** the camera is requested only on entry; a denied camera shows the adult screen and Try again works; focus returns on exit; no horizontal scroll at 390 px; the button-based Science steps are replaced.
- **Visual:** screenshots of each set at 1440 x 900 and 390 x 844, checked for overlap, readability and the camera card. Real hand tracking cannot be exercised automatically, so a check with a real camera on a device remains a manual step for the owner.

## Build order

Each step is verifiable on its own.

1. `handBenchPlay` with tests.
2. `HandActivityShell`, extracted from the Magnet frame (Magnet Lands untouched).
3. `HandBenchScene` and the Animal Types set, wired in and checked end to end.
4. Colors Canyon and Life Cycle Garden sets.
5. Remove `ScienceStarterSession`, `StarterHandController` and the button-based tests; update docs and `design-qa.md`.

## Risks

- Procedural 3D art needs real iteration to look good; expect visual revision passes per set.
- Builds and browser runs are memory-heavy on the development machine; run them in small batches.
- Real hand tracking is only verifiable on a device with a camera.
