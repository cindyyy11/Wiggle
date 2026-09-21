# Camera-First Numeria Regions Design

## Goal

Make Number Valley, Geometry Ridge and Crystal Crater play like Magnet Lands and the three Science lands: the camera opens as soon as the child enters, and each puzzle is answered with the hand on a custom 3D workbench, inside the shared camera-first frame.

This is Round 2 of the camera-first effort. Round 1 (the shared frame, the hand engine, and Animal Types, Colors Canyon and Life Cycle Garden) is built. Moving Magnet Lands onto the shared frame is a later, optional round.

## Decisions

Chosen by the product owner.

- **Camera required**, as in Round 1. If the camera cannot open (denied, unavailable, none) the child sees the "Ask an adult to turn on the camera" screen with **Try again**. There is no button, keyboard or touch fallback for answering.
- **Full custom 3D workbench per region.**
- **Point and hold** answers. Answer tokens sit on the bench; the child points at one, or holds an open hand over it, and a ring fills. A full ring is the answer. There is no grabbing or carrying.
- The shared frame and hand engine from Round 1 are reused rather than rebuilt.

## Scope

In scope: the three regions' camera-first sessions and 3D benches; the shared pieces they need (a dwell selector, a puzzle reducer, an answer scene, and an extraction of the canvas plumbing out of the Round 1 scene); wiring into `MathPlanetCanvas`; removal of the radio-button quiz and the tests that relied on it; a camera-first browser spec; docs.

Out of scope: Fraction Forest (its real, API-backed mission is unchanged); Magnet Lands; any change to `MATH_ACTIVITIES` content (prompts, hints, options, answers stay the source of truth); persistence of progress inside a region (leaving mid-region restarts it, as today); the parent space.

## Current state

- `MathPlanetCanvas` opens `MathActivitySession` for Number Valley, Geometry Ridge and Crystal Crater inside `ActivitySessionFrame`, in an overlay with a "Close activity" button. `MathActivitySession` is a radio-button quiz with 2D visuals (a number trail with a gap, a shape, two crystal groups).
- `MATH_ACTIVITIES` holds, per region, three challenges, each with a prompt, a hint, a visual, three options and one answer.
- The Round 1 pieces live in `components/handActivity/`: `HandActivityShell` (the frame), `handBenchPlay` (pointer mapping, `benchHit`), `handBenchFrame` (`trackedBenchPoint`, status text), `HandBenchScene` (a 3D scene that mixes canvas plumbing with grab-and-place logic).

## Play flow

Each region has three puzzles in a row. The mechanism is identical in all three regions.

1. A puzzle appears on the 3D bench and Wiggle reads the question aloud (the existing prompt text; spoken if voice is unmuted).
2. Three answer tokens (a number on a gem) sit along the bottom of the bench.
3. The child points at a token, or holds an open hand over it. A ring fills around it over `DWELL_MS` (1200 ms). Moving off it resets the ring after a `LEAVE_GRACE_MS` (300 ms) allowance so a shaky hand does not reset it.
4. A full ring chooses that answer.
   - Correct: sparkle, cheer sound, a progress dot fills, and after `CELEBRATE_MS` (1500 ms) the next puzzle slides in.
   - Wrong: the token wobbles, Wiggle says "Try again" and gives the existing hint, and the ring resets. Tries are unlimited.
5. After the third puzzle: "Wonderful exploring!", the region is marked complete in Numeria through the existing `onComplete(region)` path, and the exit button is available at all times.

Hand handling: any confidently tracked hand pointer counts (open hand or pointing finger). Losing the hand resets any filling ring immediately and never chooses an answer. Only a ring that fully fills counts.

## Architecture

| Unit | Purpose | Depends on |
| --- | --- | --- |
| `handActivity/BenchCanvas.tsx` (extracted) | The R3F canvas plumbing: WebGL support probe, error boundary, camera fit, lights. Extracted from `HandBenchScene`; behaviour unchanged. | react-three-fiber |
| `handActivity/benchSpace.ts` (extracted) | `BENCH_WIDTH`, `BENCH_HEIGHT`, `benchX`, `benchY`, and the bench slab and fit extents as named constants. | none |
| `handActivity/dwellSelect.ts` | Pure. Tracks which token the hand is over and for how long. Reports a progress value (0 to 1) for the ring and a `selected` id when the ring fills. Losing the hand resets it. | none |
| `handActivity/answerPlay.ts` | Pure reducer for one region: `{ index, solved, phase: "asking" \| "celebrating" \| "done" }`; actions `select(option)` and `advance`. | none |
| `handActivity/AnswerBenchScene.tsx` | The 3D scene: the current puzzle, three tokens with dwell rings, the hand cursor, wobble and sparkle. Emits `select` actions. | `BenchCanvas`, `benchSpace`, `dwellSelect`, `handBenchFrame`, a region set |
| `handActivity/answerSets/` (three sets) | Per region: a `Puzzle` component for the current challenge, a `Token` component, and token positions. Numbers are drawn with canvas textures (no font download). | `benchSpace` |
| `math/MathHandSession.tsx` | Wires `HandActivityShell`, `AnswerBenchScene`, `answerPlay` and `MATH_ACTIVITIES` for one region; plays sounds and coach lines; calls `onComplete(region)` when done. Replaces `MathActivitySession` in `MathPlanetCanvas`. | all of the above |

`HandBenchScene` is changed only to use `BenchCanvas` and `benchSpace`; its Round 1 tests must stay green.

Data flow: camera, then `useHandTracking`, then the shared hand data, then `AnswerBenchScene` each frame (hand point, token under the hand, dwell progress), then `answerPlay`, then coach lines, sounds, progress dots and completion.

Removed: `MathActivitySession.tsx`, its stylesheet and test, and the radio-button focus browser spec (`activity-session-focus.spec.ts`), replaced by a camera-first Numeria spec.

## The three puzzles

- **Number Valley:** a curving trail of stepping stones with a number on each and one empty glowing stone for the gap (the last stone for "what comes next", a middle stone for "what is missing"). A correct answer drops its number onto the stone with a sparkle.
- **Geometry Ridge:** a large polygon mountain (triangle, square, hexagon) with a beacon at each corner. A correct answer lights the beacons one by one, counting to the answer.
- **Crystal Crater:** two groups of crystals with a 3D plus or minus sign between them, matching the current 2D picture (left count, operator, right count). For subtraction the crystals that roll away are ghosted.

## Failure states and accessibility

- Camera not available: the adult-help screen with Try again (from the shared frame, including its first-render "off" handling and the focus fix after Try again).
- Reduced motion: no wobble or sparkle and near-instant easing; the ring still fills because it is the control.
- Screen readers: the shared frame's single live region carries the question, the hint and the result; the progress indicator has a role and a label. Escape and the exit button work through `ActivitySessionFrame`.
- Keyboard-only and touch-only players cannot answer; this follows from the camera-required decision and is stated in the docs.
- Camera frames and inference stay on the device.

## Testing and verification

- Unit: `dwellSelect` (fills only when held; the 300 ms allowance; a re-entry restarts; hand loss resets and never selects; selection fires once) and `answerPlay` (correct advances, wrong changes nothing, celebrating then advance, done after the third, ignored actions in the wrong phase).
- Set consistency, per region: a `Puzzle` exists for every challenge the lesson has, tokens match the lesson's options, and token hit areas are on the bench and clear of each other.
- Session, per region: a full three-puzzle play with simulated selections, a wrong answer that gives the hint and does not advance, hand loss, and resume from a re-open (which restarts).
- Existing tests: `MathPlanetCanvas` tests are updated to the new session.
- Browser: a camera-first Numeria spec for all three regions (camera requested on entry, adult help and Try again, no radio buttons, Escape, no horizontal scroll at 390 px).
- Visual: screenshots of each region at 1440 x 900 and 390 x 844. Real hand tracking, in particular whether 1200 ms feels right, needs a real camera and is the owner's manual check.

## Build order

Each step is verifiable on its own.

1. Extract `BenchCanvas` and `benchSpace.ts` from `HandBenchScene` (a refactor; Round 1 tests stay green).
2. `dwellSelect` with tests.
3. `answerPlay` with tests.
4. `AnswerBenchScene` and the Number Valley set, wired into Numeria for that region only, with the old quiz still serving the other two. Checked visually. **Stop here for the owner's review.**
5. Geometry Ridge and Crystal Crater sets; switch all three regions; remove the old quiz, its test and the radio browser spec.
6. Camera-first Numeria browser spec, docs, full verification, final review.

## Risks

- Canvas-texture digits must stay legible on a phone-sized bench; expect a visual pass.
- The hold time and hit size need real-hand tuning; the constants live in one place (`dwellSelect.ts`).
- Builds and browser runs are memory-heavy on the development machine; run them in small batches.
