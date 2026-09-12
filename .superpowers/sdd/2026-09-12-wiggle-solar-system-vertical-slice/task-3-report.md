# Task 3 — Solar-system hub and travel previews

## Delivered

- Replaced the temporary hub card in `WiggleExperience` with `SolarSystemHub` while retaining the opening phase, the existing `enterHub` store transition, Numeria-only `MissionAtlas` mounting, and the authenticated route's existing prop flow.
- Added a warm cream-to-pale-blue, procedural R3F miniature solar system as the visual primary navigation. It uses nearby elliptical orbit lines, a fixed 88-point star field, a small Lexi anchor, OrbitControls for orbit/zoom, and matte clay-style primitive geometry only.
- Made the five configured destinations visibly distinct: ringed spherical Numeria, page-like Lexicon, ringed faceted Nova Lab, cratered Reset Moon, and clustered Constellation. The canvas supports pointer selection; the adjacent labelled DOM controls provide equivalent keyboard and screen-reader access.
- Added configuration-driven destination controls and an updating live preview card. Numeria alone exposes `Enter Numeria`; the other four destinations remain selectable and expose disabled `Growing soon` states. The hub includes a visible `My Space Log` control with its `J` shortcut hint.
- Added a Framer Motion travel overlay. Normal travel is deterministic and lasts 2.4–3.28 seconds depending on the selected orbit; reduced motion enters Numeria synchronously. The existing detailed Numeria renderer is only mounted after the transition completes.
- Added deterministic hub/travel tests and updated the shell assertion for the new hub heading.

## Verification

Passed:

- `npm run test --workspace=@wiggle/web -- solarSystemScene.test.tsx` — 4 tests
- `npm run test --workspace=@wiggle/web -- experience.test.tsx solarSystemScene.test.tsx` — 7 tests
- `npm run typecheck --workspace=@wiggle/web`
- `npm run lint --workspace=@wiggle/web`
- `npm run build --workspace=@wiggle/web`
- `git diff --check`

## Scope and follow-up notes

- `My Space Log` toggles the persisted store flag and shows its accessible `J` hint. The actual keyboard shortcut, focus-managed panel, and discovery content remain Task 4 work.
- The solar canvas is intentionally hidden from the accessibility tree because the adjacent DOM destination controls are the equivalent accessible navigation. It is still the foreground visual surface and supports mouse/touch planet selection plus orbit/zoom.
- No GLTF or remote model downloads were added. The scene uses only procedural, low-detail primitives and a capped star field.

## Review fix round 1

### Fixed findings

- Planet-level `useFrame` rotation now receives and honors `reducedMotion`; the extracted `canAnimatePlanet()` helper is covered directly so individual planet rotation cannot continue in the reduced-motion branch.
- The live travel treatment now consumes `travelProgress()` in production. A deterministic `Date.now()` loop updates Framer Motion scale and the overlay's gradient position every 16ms, exposes the clamped value as `data-travel-progress`, and enters Numeria only at progress `1`. Reduced motion still calls the Numeria entry callback immediately without mounting the overlay.
- Replaced the compressed hub stylesheet with a maintainable formatted version and raised the mid-width layout breakpoint from 850px to 910px. The two-column middle layout uses shrinkable tracks, preventing the former 851–909px three-column overflow.
- Added actual scene constraints coverage: the fixed capped star count, one distinct visual silhouette per configured planet, and the reduced-motion helper are asserted without relying solely on the mocked canvas.
- Added an 880px Playwright regression that verifies the hub controls and Numeria preview are visible with no document horizontal overflow.
- Unstaged only the unrelated `.worktrees/playful-brand` deletion before preparing this fix; its contents were not changed.

### Fix-round verification

Passed:

- `npm run test --workspace=@wiggle/web -- solarSystemScene.test.tsx` — 5 tests
- `npm run typecheck --workspace=@wiggle/web`
- `npm run lint --workspace=@wiggle/web`
- `npm run build --workspace=@wiggle/web`
- `PLAYWRIGHT_EXTERNAL_SERVERS=1 npm run test:e2e --workspace=@wiggle/web -- wiggle-hub.spec.ts` — desktop and mobile projects, 2 tests passed

## Exploration-context refinement

- Clarified the hub as an original miniature-world context rather than a menu destination: the visible scene guide invites orbiting and zooming the nearby clay planets before choosing one.
- The Numeria transition now says “Landing near Numeria’s Number Valley,” making the handoff feel like entry into the existing spherical explorer space. `WiggleExperience` continues to mount the existing `MissionAtlas` in-place for the `numeria` phase, preserving click-to-walk, keyboard movement, hop, follow/globe camera, and landmark approach controls as the primary play loop.
