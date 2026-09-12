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
