# Splash screen design

## Goal

Make the existing Wiggle opening screen a reliable, accessible entry point to the already implemented Mission Atlas experience.

## Chosen approach

Keep an explicit user-initiated start action rather than auto-advancing. The opening screen will use the existing branded asset and present one clearly labeled **Let’s Wiggle** control. This preserves the intended child-friendly pause before the 3D experience and allows the optional start sound to run after a user gesture.

## Behavior

- `MissionAtlas` starts by rendering the splash for both demo and authenticated-child routes.
- The splash occupies the viewport and blocks interaction with the universe beneath it.
- Clicking, tapping, or pressing Enter/Space on the action begins a single transition. Repeated activation during that transition has no effect.
- The optional audio cue remains best-effort: unsupported or blocked audio never prevents entry.
- After the short transition, the existing `UniverseCanvas` mounts with its current initial state. No mission, auth, route, or learning-state behavior changes.

## Accessibility and presentation

- Use a semantic native button rather than a section that impersonates one.
- Give the control a clear accessible name, visible focus state, sufficient target size, and keyboard-equivalent operation.
- Add a responsive `.splash` CSS-module treatment: full viewport coverage, centered existing brand art, readable action, and a reduced-motion-safe transition.
- Preserve the project’s established colors and avoid adding dependencies or a new application shell.

## Verification

- Update focused mission tests so each enters through **Let’s Wiggle** before asserting mission content.
- Add a focused test that verifies keyboard/click activation reveals the existing atlas entry point and cannot schedule multiple exits.
- Run the affected test suite plus lint/type checking appropriate to the edited files.

## Scope boundaries

This change does not restore a removed `WiggleExperience` shell, alter route authentication, change the underlying mission flow, or replace the existing brand image.
