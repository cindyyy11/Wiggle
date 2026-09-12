# Camera-First Magnet Lab Design

## Goal

Turn Magnet Lands into a camera-first hand-gesture activity that matches the supplied reference: a child moves a large friendly magnet with an open hand and sees magnetic objects visibly pull toward it.

## Scope

- Magnet Lands only. The Science planet, other subject lands, and their optional camera flows do not change.
- Remove the in-session `Use hand gestures` toggle from Magnet Lands.
- Start local camera tracking when a child enters Magnet Lands. Browser camera permission remains the device owner's explicit choice.
- If permission is denied, unavailable, or the device has no usable camera, replace the lesson controls with a clear child-facing screen: `Ask an adult to turn on the camera`, an explanation that the activity needs a camera, and one `Try again` action.
- Keep camera frames and inference local to the device; do not add services, remote uploads, or dependencies.

## Learning Flow

### Checkpoint 1: Explore and Learn

- A large 3D horseshoe magnet is visible above the Magnet Lands workbench.
- A confident open hand, point, or otherwise visible hand pointer continuously moves the magnet across a bounded, camera-facing tabletop plane. The pointer is smoothed and clamped so the movement feels forgiving.
- When the magnet enters the attraction field of a metal object (steel coin, steel paper clip, iron spoon), that object smoothly pulls toward and follows the magnet. Its observation is recorded once.
- Wooden block and plastic toy remain in place, receive a small non-attraction reaction, and are recorded once.
- The visual mission card says that the child should move their hand to guide the magnet. Progress updates as all five objects are explored.

### Checkpoint 2: Attract or Not

- Camera remains required and active.
- The child pinches to pick up an object, moves it to a large `Attracted` or `Not attracted` target, and opens their hand to release.
- Existing correct/incorrect curriculum rules remain unchanged. A loss of hand tracking never submits an answer.

### Checkpoint 3: Hidden Magnet

- Camera remains required and active while the avatar can still walk around the campsite.
- Pointing or pinching at a nearby hiding place investigates it. The existing toolbox discovery and clue flow remain intact.

## Visual Layout

For checkpoints 1 and 2, retain the live 3D planet/campsite but frame it as a guided lab set:

- A compact cream mission card at top centre, with clear progress dots.
- A friendly guide bubble to the left.
- A right-side `Your Hand` camera card with live local preview, state dot, and one context-specific instruction.
- A foreground 3D workbench holding large, recognisable science objects.
- Soft bottom hint/fact cards. Motion is reduced when the user requests reduced motion.

Checkpoint 3 reduces the overlay again so walking and environmental searching stay prominent.

## Accessibility and Failure States

- The adult-assistance screen is the only path when camera access cannot start; the Magnet lesson has no click/touch substitute under this approved camera-first requirement.
- It names the camera requirement and exposes a keyboard-operable `Try again` button. It does not attempt to bypass the browser permission model.
- All active controls retain labels, keyboard focus, Escape close, and status announcements.
- Focus remains within the Magnet session while it is open and returns to the entry location after it closes.
- Gesture tracking continues to use confidence thresholds and a 400 ms tracking-loss grace window. Lost tracking clears visual state but never scores or releases an object.

## Architecture

- `useHandTracking` will publish a smoothed pointer for every confident detected hand, even when a named gesture cannot be classified.
- `MagnetAdventureScene` owns the moving-magnet plane mapping, attraction radius, visual reactions, and the existing 3D target interaction.
- `magnetGesture` retains pinch / open-palm semantics for checkpoint 2 and pointing / pinch investigation in checkpoint 3.
- `SciencePlanetCanvas` starts tracking automatically only in the active Magnet session, stops it when the session closes, and passes its failure state to the panel.
- `MagnetAdventurePanel` becomes the camera-first mission shell and adult-assistance state. It no longer exposes a gesture opt-in control.

## Validation

- Unit test pointer updates when a hand is confidently seen but unclassified.
- Unit test bounded magnet mapping and magnetic/non-magnetic attraction decisions.
- Keep reducer and gesture-controller tests for correct progress, loss grace, and no accidental release.
- Browser tests cover automatic permission request state, denied-camera adult screen and retry, checkpoint completion with mocked hand frames, focus trap, reduced motion, desktop, and mobile.
- Visually inspect the 3D bench, camera card, magnet movement, and narrow mobile layout.
