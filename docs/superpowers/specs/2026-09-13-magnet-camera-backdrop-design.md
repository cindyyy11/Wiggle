# Magnet Lab Camera Backdrop Design

## Goal

Let children see themselves softly behind the Magnet Lab activity without reducing the clarity of the magnet workbench, lesson card, or controls.

## Selected Direction

Use the local, mirrored camera stream as a full-bleed visual layer inside the Magnet Lab mission. It sits behind the 3D workbench and overlay controls at a low opacity, with a warm dark tint that preserves readable foreground contrast.

## Layout and Behavior

- The camera video fills the complete mission surface whenever the local camera is ready.
- It is mirrored as it is in the existing preview, so hand motion feels natural.
- A semi-transparent warm-purple/cream treatment lowers visual contrast and keeps the magnet scene dominant; the video remains recognisably visible rather than blurred.
- The existing compact `Your Hand` panel remains as an instructional/status surface, but no longer carries the primary video image.
- During camera startup, denial, and unavailability, the backdrop remains absent; the existing helpful status UI continues unchanged.
- The video is decorative: it will be hidden from accessibility navigation while the existing labelled local preview/status semantics remain available.

## Implementation Boundary

This is a scoped visual change to `MagnetLabMission.tsx` and `magnetLab.module.css`. It does not alter camera lifecycle, hand tracking, lesson rules, Canvas behavior, permissions, or network/data handling.

## Validation

- Confirm the ready camera stream appears behind the workbench at desktop and narrow mobile widths.
- Confirm the mission heading, guide, progress, and exit/retry controls retain readable contrast.
- Confirm startup and denied-camera UI does not show a stale backdrop.
- Run the focused Magnet Lab component test and web typecheck after the change.
