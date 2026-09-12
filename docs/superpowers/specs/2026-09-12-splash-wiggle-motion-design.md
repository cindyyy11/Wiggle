# Splash wiggle motion design

## Goal

Make the Wiggle splash feel continuously alive while the child decides when to enter the Mission Atlas.

## Chosen approach

Animate only the brand artwork with a small, looping horizontal-and-rotational wiggle. Keep the **Let's Wiggle** button and the full-screen splash surface still, so the call to action remains easy to read, focus, and activate.

## Behavior

- While the splash is in its ready state, `.splashBrand` runs a gentle infinite wiggle.
- One loop lasts 1.6 seconds and returns precisely to its neutral position before repeating.
- The motion uses only `transform`: small horizontal offsets and alternating rotation give the logo a playful shake without reflowing the layout.
- Once **Let's Wiggle** is activated, the logo wiggle stops immediately. The existing 320 ms fade-and-scale exit on `.splash` continues unchanged.
- The existing button behavior, audio cue, keyboard support, and single-flight entry guard remain unchanged.

## Accessibility and presentation

- The button stays motionless and retains its current 48 px minimum target and focus treatment.
- Under `prefers-reduced-motion: reduce`, both the splash transition and the decorative logo animation are disabled.
- No JavaScript timer, state, or dependency is needed for the looping visual effect.

## Implementation boundary

The change is CSS-only in `apps/web/components/mission/mission.module.css`: a child selector scoped to the ready splash state, a local keyframe sequence, and an expanded reduced-motion rule. It does not change splash markup, mission state, routes, audio, assets, or the Universe canvas.

## Verification

- Confirm the ready splash exposes the brand image and start button as before.
- Confirm the CSS scopes the animation to the brand only and excludes `.splashLeaving`.
- Confirm reduced-motion styling disables the decorative animation.
- Run the focused splash test and the relevant lint/type checks.
