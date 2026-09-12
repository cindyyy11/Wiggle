# Playful Wiggle brand treatment

## Goal

Make the learning universe feel recognisably Wiggle and more inviting to children while keeping the mission controls calm, readable and accessible.

## Brand asset treatment

- Add the supplied `Wiggle Logo.jpeg` to the web public assets as the source brand image.
- Use a compact crop of the friendly blue `w` character as the in-world header mark. It has meaningful alternative text and links home.
- Derive a square favicon/app icon from that same character so browser chrome and the product share one visual identity. The full lock-up and tagline are not shown in the dense learning HUD.

## Interface refinement

- Retain the deep-space universe background and pair it with restrained accents sampled from the brand: sky blue, leaf green, warm yellow and soft coral.
- Give the header mark, mission action, selected destination and rewards a small amount of personality through color, icon detail and tactile states.
- Keep the existing layout, learning copy, navigation destinations and fallback map behavior. The manual map switch remains outside this scoped brand pass.

## Motion and interaction

- The compact mark receives a low-frequency decorative float; this is delight, not a navigation cue.
- Buttons get transform-and-color press feedback; selected destinations get a brief state-indicating highlight.
- Success/reward states use a compact, one-time celebration rather than continuous visual noise.
- Use CSS transform/opacity only, explicit short transitions, and suppress positional movement under `prefers-reduced-motion`.

## Accessibility and verification

- Preserve 44 px touch targets, focus rings, semantic labels and the 2D fallback.
- Provide `alt` text for the logo and standard Next metadata icon declarations.
- Update focused unit coverage where the wordmark structure changes, then run lint, type-check and relevant component tests.
