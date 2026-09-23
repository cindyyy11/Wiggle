# Magnet Lands → HandActivityShell Design (Phase 3)

## Goal

Magnet Lands uses the same `HandActivityShell` chrome — and Phase 1 gesture hints / one-shot wrong-gesture nudges — as Science benches and Numeria regions, without changing magnet gameplay or the 3D workbench.

## Roadmap context

| Phase | What |
| --- | --- |
| 1 | Shared shell: gesture coaching + layout (done) |
| 2 | Completion parity + full-screen star cheer (done) |
| **3 (this spec)** | Migrate Magnet Lands onto `HandActivityShell` (same chrome; keep current magnet gameplay) |
| 4 | Redesign Magnet’s 3D mechanics |
| 5 | Constellation unlocks (Twin / API) |

## Decisions

Chosen by the product owner (brainstorming).

- **Coaching:** Chrome migration **plus** magnet `CoachMode` in `gestureCoach` (hints + nudges for explore / sort / hidden). Not chrome-only.
- **Objects key:** Keep as Magnet-only UI beside the shell (existing `.objectKey` CSS / placement). Do not add a shell slot; do not drop the key.
- **Structure:** Keep `MagnetLabMission` as the public entry; rewrite it to render `HandActivityShell`. No `MagnetHandSession` rename this phase.
- **Approach:** Shell wrap + magnet `CoachMode`; leave `magnetHandPlay` / `MagnetHandLabScene` behaviour unchanged.

## Scope

**In scope:**

- Rewrite `MagnetLabMission` to use `HandActivityShell` for camera backdrop, exit, mission card, Wiggle bubble, workbench slot, and “Your Hand” card (including gesture hint when `coachMode` is set).
- Remove duplicated chrome from `MagnetLabMission` (its own backdrop / exit / mission card / guide / camera card markup that the shell already owns).
- Extend `gestureCoach` with `{ kind: "magnet"; checkpoint: "explore" | "sort" | "hidden"; holding: boolean }`.
- Pass Magnet mission-card copy, progress dots, “Mission N of 3” step, phase coach lines, and live hand tips into the shell the same way Science/Numeria do (`coach` prop; shell may briefly override with a nudge).
- Keep Objects key rendered by `MagnetLabMission` as a sibling of the shell content (show in explore/sort; hide during hidden), unchanged rules.
- Preserve `onComplete` / `onExit` / `manageFocus` so `SciencePlanetCanvas` wiring stays unchanged.
- Unit tests for magnet coach mapping and mission complete/exit/Objects behaviour; update Magnet tests that assert the old DOM chrome shape.
- `design-qa.md` record for this phase.

**Out of scope:**

- Phase 4 Magnet 3D redesign (attraction visuals, table layout, prop art).
- Phase 5 constellation / Twin unlocks.
- Renaming `magnetLab.module.css` or `MagnetLabMission`.
- Changing attraction rules, checkpoint progression, or `magnetHandPlay` / scene hit-testing.
- Persistence changes (Phase 2 cheer still counts Magnet via existing canvas `onComplete`).

## Current state

- `HandActivityShell` owns shared camera-first chrome and optional `coachMode` → hint glyph + one-shot nudge (`gestureCoach.ts`). Modes today: `bench` and `answer` only.
- `MagnetLabMission` still duplicates that chrome and uses `magnetLab.module.css` directly. Kids on Magnet do not get Phase 1 hints/nudges.
- Gameplay: `magnetHandPlay` + `MagnetHandLabScene` — explore (open hand guides magnet), sort (pinch / open palm over PULLS or NO PULL), hidden (point at toolbox).
- Objects key lists Pulls / No pull learning state; Magnet-only.

## Architecture

| Unit | Purpose | Depends on |
| --- | --- | --- |
| `gestureCoach` | Magnet expected hint + wrong-gesture line + nudge re-arm | `MagnetCheckpoint` / holding flag |
| `HandActivityShell` | Unchanged props API; Magnet becomes another caller | `gestureCoach`, `magnetLab.module.css` |
| `MagnetLabMission` | Play state, completion, Objects key, attraction sound cues; shell for chrome | Shell, scene, `magnetHandPlay` |
| `MagnetHandLabScene` / `magnetHandPlay` | Unchanged 3D + curriculum | — |

### Gesture map

| Checkpoint | Holding? | Expected hint | Wrong-gesture nudge |
| --- | --- | --- | --- |
| explore | — | open palm | “Open your palm to move the magnet!” |
| sort | no | pinch | “Pinch to pick up an object!” |
| sort | yes | open palm | “Open your palm over PULLS or NO PULL!” |
| hidden | — | point | “Point to find the hidden magnet!” |

`holding` is true when `state.held` is set (sort only).

Mission titles / instruction copy stay Magnet’s current three checkpoint strings. Phase greetings (starting / help / explore / sort / hidden / complete) stay; live hand status from the scene still upgrades the coach bubble when specific (shell owns speech / nudge priority as for other lands).

### Behaviour edges

- Camera denied / unavailable / stuck off after start: shell adult-help + Try again; workbench scene not mounted until ready.
- Tracking drops while holding in sort: keep existing cancel-held behaviour in the mission.
- Complete: call `onComplete` once when `foundHiddenMagnet` becomes true.
- Exit / Escape / focus restore: via shell `manageFocus` (same contract as today when `manageFocus` is false for canvas overlay).
- Objects key must not newly cover the workbench beyond current layout.

## Testing

- `gestureCoach`: magnet hints, wrong lines, one-shot nudge per phase key, re-arm on checkpoint/holding change.
- `MagnetLabMission`: complete once, exit, Objects key visibility; asserts go through shell chrome (label / exit / Your Hand) rather than Magnet-only duplicate structure where tests previously targeted it.
- Existing Magnet camera / play tests remain green.
- Manual: live camera on Magnet after migrate — hint glyph and nudge timing (record as pending in design-qa if not run).

## Success criteria

Magnet Lands feels like the other hand lands (hint + nudge), still plays the same three checkpoints with the same 3D lab, and Science Planet canvas wiring needs no behavioural change.
