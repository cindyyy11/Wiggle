# Planet Slide Whoosh Design

## Goal

Give a clear, slightly louder whoosh when the child slides to another planet on the subject-world chooser, without changing other Wiggle sound cues.

## Selected Direction

Add a dedicated synthesized `slideWhoosh` cue in `useWiggleSound` and play it from `SubjectWorlds.slide` only when the selected planet actually changes.

## Behavior

- Triggers on carousel slide via swipe or arrow buttons (both call `slide`).
- Plays only when the clamped next world differs from the current selection.
- Does not play when already on the first or last planet and the child tries to slide further.
- Respects the existing per-browser mute preference (`wiggle:muted`).
- Does not change universe camera / landmark `whoosh` volume or character.

## Audio

- Keep Wiggle’s synthesized Web Audio approach (no audio files).
- `slideWhoosh` is the same airy bandpass noise whoosh as `whoosh`, but with peak gain `0.14` (vs `0.05` for universe `whoosh`) so laptop speakers hear it clearly on slide.
- Failure to create or resume `AudioContext` remains silent and non-blocking.

## Implementation Boundary

- Extend `WiggleSoundName` and playback dispatch in `apps/web/features/audio/useWiggleSound.ts`.
- Call `useWiggleSound().play("slideWhoosh")` from `apps/web/components/worlds/SubjectWorlds.tsx` inside `slide` after confirming a real selection change.
- Update focused unit tests for the sound hook and SubjectWorlds slide behavior.
- Out of scope: new mute UI, sample assets, changing other mission/magnet/universe cues, ambient soundscapes.

## Validation

- Sliding between planets plays one louder whoosh per successful change.
- Swiping or pressing arrows at either end produces no sound.
- Muted preference produces no sound.
- Existing universe `whoosh` behavior and level remain unchanged.
- Focused audio and SubjectWorlds tests pass; web typecheck stays clean.
