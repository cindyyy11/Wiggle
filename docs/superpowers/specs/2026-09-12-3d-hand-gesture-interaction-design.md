# Wiggle 3D Hand-Gesture Interaction Design

## Goal

Turn Wiggle's existing camera-gesture recognizer into a reliable, local-first 3D interaction system for Fraction Forest. A child can aim at real scene objects, point to focus them, pinch or fist-grab a pizza slice, move it to the plate, release it, and complete the three-quarters mission without touching the screen. Open-palm interaction summons Lexi only when the child aims at Lexi's 3D beacon.

## Product Boundary

This delivery makes all four supported gestures physically meaningful in the existing Fraction Forest scene. It does not make every future Numeria object draggable. The implementation extracts reusable hand tracking and 3D interaction boundaries so a later activity can opt into the same system without duplicating vision, raycasting, or gesture-state code.

- **Point** aims a virtual cursor at an interactive 3D object. A stable point focuses a slice, plate, or Lexi beacon; the focused object gets a quiet visual lift or glow.
- **Pinch** is the precise grab gesture. Pinching a focused or raycast slice begins a drag, retains the slice while the pinch remains stable, and drops it when the pinch ends.
- **Fist** is the broad alternative grab. Closing a fist over a focused or raycast slice begins the same drag; opening the fist ends it. It does not toggle a slice merely because it crosses a screen zone.
- **Open palm** activates Lexi only after it is held over Lexi's actual 3D beacon. An open palm elsewhere has no learning action, which prevents accidental interruption while dropping a slice.

All four gestures interact through 3D hit testing; none map directly to fixed horizontal screen zones.

## Child Experience

1. The child reaches Fraction Forest and chooses **Gesture** or **Gesture + Visual**. Wiggle explains that the camera is used locally to see a hand and provides a clear opt-in action.
2. Once permission is granted, a tiny, mirrored hand cursor appears over the world. The camera preview remains hidden unless the child or supervising adult enables it.
3. Pointing at a pizza slice gives it a soft outline and a small lift. Pointing at the plate gives it a gentle target glow. Pointing at Lexi gives the beacon a glow.
4. A stable pinch or fist over a slice lifts it from the pizza. The slice follows the smoothed hand position on a plane fixed at the slice's depth, so it never jumps toward the camera.
5. Releasing over the plate places the slice. Releasing elsewhere returns it calmly to its home position. A placed slice can be picked up again and returned, so the answer remains correctable.
6. When exactly three slices are on the plate, Wiggle validates automatically, plays the existing gentle completion treatment, and records the gesture completion event. The fourth slice remains available but is not needed.
7. Holding an open palm over Lexi's beacon opens the existing Lexi help panel. Open palm must be stable and the beacon must be the current raycast target.
8. If tracking is briefly lost while holding a slice, Wiggle waits 400 ms. It shows “Show me your hand 👋” if tracking remains absent, then safely returns the held slice to its last valid home or placed location rather than dropping it somewhere arbitrary.

## Architecture

### Local vision and gesture state

The hand stack remains browser-only and keeps MediaPipe dynamically imported after camera consent. It will be reorganized into focused modules under `apps/web/features/gestures/`:

- `config.ts` exports the single `GESTURE_CONFIG` tuning source: palm-relative pinch threshold, minimum confidence, stable-hold duration, release duration, pointer EMA factor, dead-zone amount, loss grace duration, and maximum inference FPS.
- `handMath.ts` contains scale-normalized distance, vector/angle, and pointer smoothing helpers. Finger extension uses landmark vectors/relative joint angles rather than raw screen Y coordinates so rotated hands remain usable.
- `gestureClassifier.ts` classifies `pinch`, `point`, `open_palm`, `fist`, or `none` from the 21 landmarks, handedness, and confidence.
- `gestureStateMachine.ts` converts raw classified frames into stable `start`, `hold`, and `end` phases. It holds one active gesture until a stable release/switch and exposes loss-grace timing.
- `useHandTracking.ts` owns camera lifecycle and throttled inference. Its public result includes `gesture`, `pointer` in mirrored normalized-device coordinates (`x` and `y` in `-1..1`), `handedness`, `confidence`, `isTracking`, `status`, a video ref, and the phase callbacks.

The existing `useGestureControls` compatibility entry point will either be replaced or become a thin adapter during the migration; no view component owns camera cleanup or gesture debouncing itself.

The hook runs inference at no more than 20 FPS, skips repeated decoded video frames, and uses refs for changing callbacks and frame data. It never serializes frames, transmits video, records video, requests audio, or persists hand landmarks.

### Scene interaction bridge

`UniverseCanvas` will receive a declarative hand-interaction presentation object only while the Fraction Forest gesture activity is active. It forwards that object into `UniverseScene`, where a `GestureInteractionLayer` runs inside the React Three Fiber canvas.

The layer owns the per-frame parts of interaction in refs:

- It converts the normalized virtual pointer to a camera ray.
- It raycasts only meshes marked `userData.interactive = true` and tagged with a stable object ID and role (`pizza-slice`, `plate`, or `lexi-beacon`).
- On a grab start, it creates an invisible interaction plane at the selected slice's world depth, intersects later rays with that plane, and lerps toward the resulting target position.
- It reports discrete semantic actions (`focus`, `grab`, `move`, `drop`, `open-lexi`) to `MissionAtlas`; it does not update learning progress directly.

Raycasting, plane intersection, and mesh transforms remain in R3F frame code. React state changes only on meaningful edges such as a changed focus target, drag start/end, valid plate placement, or mission completion. This protects both render smoothness and camera inference performance.

### Pizza state and fallback equivalence

The pizza model becomes controlled by a semantic slice state rather than a simple selected-index list. Each slice has a stable ID, home transform, current presentation state (`available`, `held`, or `placed`), and an accessible action surface. The 3D model renders those values; it does not decide mission correctness.

`MissionAtlas` remains the owner of mission state, completion, event queueing, and Lexi support. It receives discrete scene actions and decides whether a drop is inside the plate's acceptance zone. It will expose the same `placeSlice`, `returnSlice`, `focusSlice`, and `summonLexi` command model to:

- hand gestures through the R3F interaction layer;
- existing 3D mouse/touch pointer events;
- labelled DOM buttons and a keyboard-friendly selector;
- the 2D/WebGL fallback.

Thus a child who cannot or does not want to use a camera can finish the same activity with mouse, touch, or keyboard. The old “Check my pizza” control becomes a non-blocking confirmation/accessible fallback; placing the third slice is the canonical completion trigger in gesture play.

### Gesture conflict rules

The scene controller makes the four gestures deterministic:

1. A current `pinch` or `fist` drag has priority over focus changes.
2. Ending a drag always resolves the drop before a new gesture may activate.
3. An open palm immediately after a fist release cannot summon Lexi until the gesture state machine has observed the configured release boundary and a fresh stable palm hold over the Lexi beacon.
4. Point can focus any interactive target but cannot silently move a slice.
5. If a gesture begins with no raycast target, it has no scene side effect.

## Feedback and Debugging

Children see only a small hand cursor, a concise tracking state, hover/focus glow, a subtle selected-slice lift, plate highlight, and the lost-hand prompt. Wiggle does not show raw landmarks or technical confidence by default.

A developer-only debug mode, enabled with `?handDebug=1`, may show the current gesture, confidence, inference rate, pointer position, and landmark skeleton in the locally rendered preview. It is off by default and does not change what data is stored or transmitted.

## Learning Events and Privacy

The interaction system exposes in-memory `onGestureStart`, `onGestureHold`, and `onGestureEnd` callbacks for activities. It emits semantic learning events only when a gesture affects the mission:

- `gesture_interaction` for a meaningful select, grab, move, or drop;
- `object_selected`, `object_moved`, and `object_dropped` for the pizza action lifecycle;
- `gesture_task_completed` when three slices have been correctly placed through gesture interaction.

Each persisted event includes only the gesture name, logical object ID, and success/result fields. It does not include webcam frames, landmarks, image data, biometric measurements, raw screen coordinates, or camera metadata.

The typed contracts, API validation, database event constraint/migration, local queue, and test fixtures will be updated together so these events are accepted without directly mutating the Digital Twin from hand-tracking code.

## Reliability and Error Behaviour

- Camera permission remains explicit and child-friendly. Denial, unavailable hardware, insecure contexts, model-load failures, or network failures to static model assets leave all fallback controls functional.
- The hook cleans up video tracks, MediaPipe resources, scheduled frames, and pointer/drag state on disable, unmount, page hide, mission exit, and errors.
- Classification requires configured confidence and stability thresholds, uses EMA pointer smoothing plus a dead zone, and accepts both left and right hands.
- A lost hand has a 400 ms grace period. No held object is abandoned halfway through a transient missed frame.
- The system prioritizes stable pinch/fist movement and bounded 20 FPS inference over maximum recognition rate. The R3F render loop stays independent and targets normal scene frame rate.

## Verification

Automated tests will cover:

- Palm-relative pinch, rotated finger-extension, left/right hands, invalid landmarks, jitter, confidence loss, stable start/hold/end phases, pointer smoothing, and loss grace.
- Pure 3D interaction-controller decisions: raycast focus, pinch/fist acquisition, stable-plane movement, valid and invalid drops, placed-slice removal, open-palm Lexi activation, and gesture conflict ordering.
- `MissionAtlas` integration: automatic three-of-four completion, correct semantic event queue entries, no direct Twin mutation, and equivalent button/touch/keyboard completion.
- Camera lifecycle: no media request before consent, no frame upload, model and tracks close on exit, denied camera preserves mission play, and debug is off by default.
- Browser coverage with a mocked camera and MediaPipe result for the child flow; manual QA on real left/right hands at close and far distances, shaky/slow motion, low light, busy background, and brief disappearance.

## Out of Scope

This release does not add multi-hand interactions, persistent calibrated hand profiles, video recording, server-side vision, arbitrary world-object manipulation, or a production analytics dashboard for raw gesture telemetry. It uses the existing Fraction Forest pizza and Lexi beacon as the first reusable 3D interaction surface.
