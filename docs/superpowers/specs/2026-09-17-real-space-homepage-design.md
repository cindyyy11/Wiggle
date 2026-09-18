# Real-Space Homepage Design

## Goal

Refine the existing subject-world homepage into a believable deep-space environment while preserving its child-friendly character, routes, interactions, accessibility, and existing planet artwork. Remove common AI-generated visual tells, especially excessive glow, glassy pills, and uniformly rounded controls. A familiar lock symbol remains visible for unavailable worlds at the user's request.

## Design Direction

The page uses a real-space hybrid direction: an astronomical navy-black backdrop with natural variation, faint galactic dust, layered stars, and a restrained constellation chart. The planets remain colorful and approachable so the experience still feels like a learning adventure rather than a scientific dashboard.

Design dials:

- Design variance: 7. The composition remains focused but avoids perfect symmetry.
- Motion intensity: 6. Atmospheric movement is slow; controls respond quickly and physically.
- Visual density: 4. Space remains open, with details concentrated around navigation and the selected world.

## Visual System

### Background

- Replace bright purple and teal radial washes with a near-black indigo base.
- Build depth from several low-opacity nebula and dust layers rather than a single obvious gradient.
- Use stars at multiple sizes, temperatures, and opacity levels. Most stars remain dim; only a few receive a soft bloom.
- Keep star movement extremely slow and disable it for reduced-motion users.
- Avoid a tiled or evenly distributed star pattern.

### Constellation Layer

- Add one subtle, chart-like constellation field behind the planets using CSS elements or an accessible decorative SVG without hand-drawn iconography.
- Use thin, low-opacity blue-white lines and small star nodes with varied intensity.
- Keep the chart away from primary text and action controls so it never reduces readability.
- Treat the constellation as atmosphere only: it is hidden from assistive technology and does not intercept pointer input.

### Typography and Color

- Preserve the existing Wiggle wordmark and page copy.
- Replace the serif carousel title with the existing interface sans-serif to make the screen feel contemporary and intentional.
- Use warm off-white for primary text, muted blue-gray for secondary copy, and one pale-cyan accent for focus and active states.
- Keep a single dark page theme with no inverted sections.

## Controls

### Primary Action

- Replace the rounded gold pill with a compact mission-control button: modest corner radius, solid warm surface, crisp border, and a small directional glyph.
- Use a short lift and compression response for hover and press states.
- Keep the label on one line and maintain accessible contrast.

### Carousel Navigation

- Replace translucent circular glass arrows with compact square instrument buttons.
- Use restrained borders, a dark solid surface, and clear arrow glyphs.
- Disabled controls remain readable but visibly unavailable.

### Subject Selector

- Replace pills with a segmented navigation rail using short underline or edge indicators.
- Show a visible `🔒` beside “Coming soon” and in the BM/English tab labels so unavailable worlds are immediately recognizable. Preserve the existing accessible labels without reading the decorative symbol aloud.
- Use the cyan accent only for the selected subject and keyboard focus.

## Interaction and Motion

- Preserve swipe, click, keyboard, route, locked-world, and planet-selection behavior.
- Use atmosphere motion only to convey depth; it must not compete with the planets.
- Control transitions stay between 120 and 220 milliseconds and use transforms or opacity.
- Respect `prefers-reduced-motion` by stopping ambient drift and eliminating large movement.

## Responsive Behavior

- Keep the selected planet as the main visual focus on desktop and mobile.
- Maintain touch targets of at least 44 by 44 pixels.
- On small screens, keep navigation controls clear of the title, planet canvas, system safe areas, and status message.
- Reduce constellation density and background bloom on mobile rather than shrinking every decorative element.

## Architecture and Scope

The change is confined to the subject-world homepage presentation. Existing React state, routing, Three.js world rendering, mission entry behavior, sound hooks, parent entry, and Twin launcher remain unchanged. Markup changes are limited to semantic wrappers needed for styling or accessibility. Most work belongs in `SubjectWorlds.module.css` and `WorldSelector.tsx`.

No new runtime dependency or remote image asset is required. The atmosphere is generated locally with CSS and decorative markup so it remains fast and works offline.

## Validation

- Run the existing subject-world component and browser tests.
- Run lint and TypeScript checks for the web app.
- Inspect the homepage at desktop and mobile widths.
- Verify button contrast, visible keyboard focus, 44-pixel touch targets, non-wrapping CTA text, and reduced-motion behavior.
- Confirm locked worlds, swipe navigation, previous/next navigation, and the active-world route still behave as before.

## Out of Scope

- Redesigning individual subject planets or their internal mission screens.
- Replacing the Wiggle brand.
- Adding new subjects, routes, or learning content.
- Introducing photorealistic image downloads or a new animation library.
