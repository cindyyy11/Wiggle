# Magnet Lab Feel Upgrade Design (Phase 4)

## Goal

Make Magnet Lands’ magnetism and sorting *read* clearly in 3D — kids should instantly see “this sticks” vs “this doesn’t,” and feel correct vs wrong bin drops — without changing curriculum rules or prop models.

## Roadmap context

| Phase | What |
| --- | --- |
| 1 | Shared shell: gesture coaching + layout (done) |
| 2 | Completion cheer (done) |
| 3 | Magnet Lands on `HandActivityShell` (done on this branch) |
| **4 (this spec)** | Magnet 3D **feel** upgrade (explore + sort visuals/motion) |
| 5 | Constellation unlocks (Twin / API) |

## Decisions

Chosen by the product owner (brainstorming).

- **Primary focus:** Feel (readable pull / reject / bin feedback), not new prop art.
- **Checkpoints:** Explore + sort. Hidden magnet reveal stays as today.
- **Rules:** Visual/motion only. `MAGNET_FIELD_RADIUS`, observe/grab/drop correctness, and hit targets stay frozen.
- **Approach:** Scene-feel pass in `MagnetHandLabScene` (+ small pure timing helpers if tests need them). Do not rework `magnetHandPlay` curriculum.

## Scope

**In scope:**

- **Explore:** Soft field ring under the horseshoe (explore only; stronger when any object is in-field). Metal in field: faster follow, snap slightly under the magnet, brighter emissive; keep Zzz sparks, `PULLS!` banner, `magnetPull` cue. Non-metal in field: short push-away (~1 cycle), reject tint, `NO PULL` banner, `magnetStay` cue.
- **Sort:** Pad hover tint when a held object is over PULLS / NO PULL. Correct drop: brief green pulse on that pad. Wrong drop: red flash + ~300 ms wobble at the pad, then the same cancel (object returns home) — no rule change.
- **`reducedMotion`:** Skip shake, push-away flourish, and fancy lerp; still update poses, colors, banners, and pads.
- Tiny pure helper module (e.g. `magnetSceneFeel.ts`) for wobble duration / reject offset constants if unit-tested without R3F.
- Tests + `design-qa.md` record.

**Out of scope:**

- New prop models, campsite dressing, or magnet mesh redesign.
- Changing field radius, observe/grab/drop logic, or hidden-magnet rules.
- Shell / gesture-coach changes (Phase 3).
- Phase 5 constellation / Twin.
- Retuning play math “for feel” (deferred unless a later phase asks).

## Current state

- `MagnetHandLabScene` already lerps the magnet and objects, scales/emissives on pull, shows `PULLS!` / `NO PULL` banners, plays Zzz sparks, and fires `magnetPull` / `magnetStay` cues.
- Non-metal “reject” is mostly tint + banner — easy to miss.
- Wrong sort drops cancel immediately with little visual punishment.
- `magnetHandPlay` owns curriculum; must stay behaviour-identical.

## Architecture

| Unit | Purpose | Depends on |
| --- | --- | --- |
| `MagnetHandLabScene` | Apply field ring, stick/reject motion, pad flashes, wrong-drop wobble | Existing play state + field helper |
| `magnetSceneFeel` (optional small pure module) | Named timings/offsets for tests | None |
| `magnetHandPlay` | Unchanged | — |
| `MagnetLabMission` | Unchanged (already on shell) | — |

### Explore feel

1. Field ring mesh under magnet, visible in explore only; opacity rises when `isWithinMagnetField` is true for any object.
2. Attracted + in field: higher follow lerp toward magnet; target slightly under horseshoe; emissive + sparks + banner + pull cue (edge-triggered as today).
3. Not-attracted + in field: brief radial push-away from magnet, then ease home; reject tint; banner + stay cue.
4. Reduced motion: snap poses; keep color/banner truth; no ring pulse / push / shake.

### Sort feel

1. While holding, pad under pointer gets a hover tint (attracted pad warm, not-attracted cool — match existing pad colors).
2. Correct drop: green pulse (~200–300 ms) on that pad; object settles to sorted pose (existing).
3. Wrong drop: red flash + wobble ~300 ms at drop site, then existing cancel path (held cleared, object returns home).
4. Reduced motion: flashes only.

### Behaviour edges

- Hidden checkpoint: no field ring, no bin VFX.
- Multiple metals in field: one active pull id (as today); ring still shows in-field.
- Tracking loss: existing grace + cancel held; no new scoring.
- Sound cues remain edge-triggered (no per-frame spam).

## Testing

- Unit-test pure feel constants / helpers (wobble ms, reject offset) if extracted.
- Keep `magnetHandPlay`, `MagnetHandLabScene`, and `MagnetLabMission` suites green with no curriculum expectation changes.
- Visual: live camera explore (metal stick + wood/plastic reject) and one wrong sort drop at desktop / ~390 px — note pending in design-qa if not run.

## Success criteria

A kid can tell metal sticks and wood/plastic don’t without reading labels; a wrong bin drop feels like a mistake before the object goes home. Curriculum outcomes match pre-Phase-4 behaviour.
