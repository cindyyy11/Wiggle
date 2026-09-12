# Camera-First Magnet Lab Design

## Goal

Turn Magnet Lands into a camera-first hand-gesture activity that matches the supplied reference: a child moves a large friendly magnet with an open hand and sees magnetic objects visibly pull toward it.

## Scope

- Magnet Lands only. The Science planet, other subject lands, and their optional camera flows do not change.
- Remove the in-session `Use hand gestures` toggle from Magnet Lands.
- Start local camera tracking when a child enters Magnet Lands. Browser camera permission remains the device owner's explicit choice.
- If permission is denied, unavailable, or the device has no usable camera, replace the lesson controls with a clear child-facing screen: `Ask an adult to turn on the camera`, an explanation that the activity needs a camera, and one `Try again` action. A permission denial is distinguishable from general device/model unavailability internally, but both present this same child-facing state.
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

- `useHandTracking` will publish a smoothed pointer for every confident detected hand, even when a named gesture cannot be classified. It will distinguish `denied` from `unavailable`, expose a retry method, and clear stale pointers when confidence or coordinates are invalid.
- A new, pure `magnetHandPlay` module owns bounded hand-to-table mapping, attraction-radius decisions, and checkpoint progress. It has no React or Three.js dependency.
- A new `MagnetHandLabScene` is a compact React Three Fiber workbench. It renders the moving 3D horseshoe magnet, object reactions, and visual guide effects from `magnetHandPlay` state.
- The existing `MagnetLabMission` becomes the camera-first mission shell: it starts `useHandTracking` as soon as the mission opens, renders the adult-assistance/retry screen when needed, and hosts the 3D lab, mission card, camera card, guide, and progress.
- `SciencePlanet` remains the owner of opening and closing the mission. Closing the mission unmounts it, which stops every camera track and releases the local model.

## Validation

- Unit test pointer updates when a hand is confidently seen but unclassified.
- Unit test bounded magnet mapping and magnetic/non-magnetic attraction decisions.
- Unit test checkpoint progress, loss grace, and no accidental release.
- Component and pure interaction tests cover checkpoint completion with mocked hand frames. Browser tests cover automatic permission request state, denied-camera adult screen and retry, focus return, reduced motion, desktop, and mobile without requiring a physical camera or remote inference.
- Visually inspect the 3D bench, camera card, magnet movement, and narrow mobile layout.
