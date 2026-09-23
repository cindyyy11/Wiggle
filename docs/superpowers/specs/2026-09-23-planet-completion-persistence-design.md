# Planet Completion Persistence + Constellation Stars (Phase 5)

## Goal

Persist Science and Numeria land/region completions across visits on this device, unlock one constellation star per planet when all four are done, and keep the all-four cheer once per browser session.

## Roadmap context

| Phase | What |
| --- | --- |
| 1 | Shared shell: gesture coaching + layout |
| 2 | Completion parity + full-screen star cheer (visit-only) |
| 3 | Magnet Lands → `HandActivityShell` |
| 4 | Magnet lab feel (explore/sort motion) |
| **5 (this spec)** | Persist completions + unlock planet constellation stars (device-local) |

This phase supersedes Phase 2’s “refresh clears progress” and “constellation / Twin API later” notes for Science and Numeria. Twin **API** sync remains future work.

## Decisions

Chosen by the product owner (brainstorming).

- **Outcome:** Persist completions **and** unlock constellation stars from them.
- **Star grain:** One star per planet when all four lands/regions are complete (`science-explorer`, `numeria-explorer`). Not one star per land.
- **Storage:** Device `localStorage` only (same family as `twinMemory` / `constellationMemory`). No Twin API writes this phase.
- **Cheer:** Once per **browser session** per planet when the set is (or becomes) size 4. Use `sessionStorage` for the cheer flag; use `localStorage` for completions.
- **Stars UI:** Same “My Learning Constellation” catalog — hybrid unlock (Twin-signal stars + local planet-completion stars).
- **Approach:** Local completion memory + hybrid constellation merge.
- **Branch:** Stay on `feat/magnet-hand-shell` unless a separate PR is requested later.

## Scope

**In scope:**

- Persist and hydrate Science `completedZones` and Numeria `completedRegions` keyed by child id.
- New constellation star ids `science-explorer` and `numeria-explorer` with kid-facing titles/descriptions; unlock when local all-four is true; locked progress = `completedCount / 4`.
- Wire Twin screen, `WiggleConstellation`, `newlyUnlockedStars` / seen-stars memory, and `starDestination` for the new ids.
- Session-scoped cheer gate (replace mount-only “cheer once this visit” with “once this tab session”).
- Pass `childId` into Science planet canvas (Numeria already has it); fall back to `DEMO_CHILD_ID`.
- Unit tests for memory, cheer gate, constellation hybrid unlock, canvas hydrate/save, and already-complete session cheer.

**Out of scope:**

- Twin / backend API persistence or cross-device sync.
- Per-land constellation stars or planet HUD badges beyond existing “N of 4” / Complete chrome.
- Magnet shell/feel redesign (Phases 3–4).
- Parent dashboard changes.
- Changing Fraction Forest’s API mission path beyond continuing to count toward Numeria’s four.
- E2E smoke (optional later; not required for this phase).

## Current state

- **Completions:** `SciencePlanetCanvas` / `MathPlanetCanvas` keep in-memory sets; empty on mount. Phase 2 cheer uses a `cheerShown` ref (once per mount).
- **Constellation:** `packages/contracts/src/constellation.ts` derives six stars only from `LearnerTwin` signals. `MyWiggleTwinScreen` / `WiggleConstellation` call `getConstellationStars(twin)`. Seen-star ids live in `constellationMemory` (`localStorage`).
- **Child id:** `MathPlanetCanvas` already accepts `childId`. Science canvas does not; TwinLauncher uses `currentChild ?? DEMO_CHILD_ID`.

## Architecture

| Unit | Purpose | Depends on |
| --- | --- | --- |
| `apps/web/components/planet/planetCompletionMemory.ts` (new) | Load/save Science zones and Numeria regions per child; corrupt JSON → empty set; never throw. | `localStorage`, zone/region id types |
| `apps/web/components/planet/planetCheerSession.ts` (new) | Pure helpers + `sessionStorage` (or in-module session map) for `hasCheeredPlanet` / `markCheeredPlanet` (`science` \| `numeria`). | `sessionStorage` |
| `planetCheerGate.ts` (modified or callers updated) | Keep size-crossing helper; canvases also queue cheer on hydrate when size ≥ 4 and session flag clear. | — |
| `SciencePlanetCanvas.tsx` / `MathPlanetCanvas.tsx` (modified) | Init from memory; save on each new complete; session cheer gate; Science gains optional `childId`. | memory, cheer session, existing cheer overlay |
| `SciencePlanet.tsx` (modified) | Pass `childId` through to canvas. | worlds / props |
| `packages/contracts/src/constellation.ts` (modified) | Add planet star ids. Extend `getConstellationStars(twin, planetProgress?)` so Twin-signal stars stay Twin-only and the two planet stars use `planetProgress` (`scienceCompleted` / `numeriaCompleted` counts 0–4). Omit/`undefined` → planet stars locked at progress 0. Update `newlyUnlockedStars` to take the same optional arg. | `LearnerTwin`, optional planet progress |
| `starDestination.ts` (modified) | Map new ids → Science world / Numeria. | route builders |
| `WiggleConstellation.tsx` / `MyWiggleTwinScreen.tsx` / `nextStep` path (modified as needed) | Supply local planet unlocks when building the star list. | contracts + `planetCompletionMemory` |
| Tests | Mirror existing `*.test.ts(x)` patterns under `planet/`, `contracts`, canvases, constellation UI. | Vitest |

### Data flow

1. On planet mount: `loadCompleted*(childId)` → React state; if `size >= 4` and `!hasCheeredPlanet(planet)`, queue cheer for when no session is open (same pending-cheer timing as Phase 2).
2. On land/region complete: idempotent add → `saveCompleted*` → if size crosses to 4 and not yet cheered this session, queue cheer after session close.
3. On Twin / constellation render: Twin stars from API Twin; planet stars unlocked/progress from `planetCompletionMemory`; merge into one catalog for display and “newly unlocked” banners.
4. Tab close clears cheer session flags; completions remain.

## Behaviour

1. **Persist:** Completing a land/region writes the updated set immediately. Revisit or full page reload restores badges and “N of 4”.
2. **Cheer:** At most once per planet per browser tab session. Crossing 4th for the first time in that session, or opening an already-complete planet with no cheer yet this session, shows `PlanetCompletionCheer` after any open session closes. Fresh tab after close may cheer again if still complete.
3. **Constellation:** When all four Science lands are saved, `science-explorer` unlocks; same for Numeria → `numeria-explorer`. Progress while locked is visual only (no percentage text to the child).
4. **Idempotent:** Re-completing a land does not change the set or re-trigger save side effects beyond writing the same ids.
5. **Errors:** Missing/invalid storage → empty progress; UI stays usable.

## Copy (kid-facing)

Reuse Phase 2 cheer copy. Constellation:

| Id | Title | Description |
| --- | --- | --- |
| `science-explorer` | Science Explorer | You explored all four Science lands. |
| `numeria-explorer` | Numeria Explorer | You explored all four Numeria regions. |

(Wording may match cheer body tone; keep short and strength-focused — no scores.)

## Testing

- `planetCompletionMemory`: round-trip save/load; corrupt / missing keys → empty; keys scoped by child + planet.
- `planetCheerSession`: mark/has; independent science vs numeria; cleared when session storage cleared (or simulated).
- `getConstellationStars` (or merge helper): Twin stars unchanged; planet stars unlock only with flags; progress `n/4`.
- Canvases: hydrate shows Complete badges; completing a land persists; fourth complete queues cheer once per session; already-four on mount cheers once then not again until new session.
- Constellation / Twin screen: new ids appear; newly-unlocked banner respects seen-star memory including planet ids.
- Existing Phase 2 / Magnet / shell tests still pass.

## Success criteria

- Refreshing the app keeps Science and Numeria completion chrome.
- Finishing (or revisiting) all four unlocks the matching constellation star on this device.
- All-four cheer fires at most once per planet per browser session.
- Twin-signal constellation stars still derive only from Twin numbers; no fake Twin signal bumps.
- No Twin API or parent-dashboard changes required for the feature to work offline on one device.
