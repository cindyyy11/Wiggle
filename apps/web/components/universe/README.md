# Universe integration

`UniverseCanvas` is a client component. It renders the same named destinations and mission entry in the 3D scene and 2D map. It works on its own with local exploration state, or with a mission controller:

```tsx
<UniverseCanvas
  mode={cameraMode}
  onModeChange={setCameraMode}
  destination={destination}
  onDestinationChange={setDestination}
  onLandmarkSelect={selectLandmark}
  onMissionStart={startFractionMission}
  pizza={{ visible: visualMode, selectedSlices, onSliceSelect: toggleSlice }}
>
  {missionOverlay}
</UniverseCanvas>
```

- `mode`: controlled `globe`, `follow`, or `mission`. Omit it for local mode switching. Mission mode frames the Fraction Forest pedestal and dims terrain.
- `destination`: `{ latitude, longitude }` in radians. The astronaut travels along the sphere; click/tap destinations report through the same callback. Pass `null` to cancel queued travel, or omit the prop (`undefined`) to retain locally selected travel. Keyboard movement cancels a queued destination. Explicit destinations, including `null`, take priority over mission mode's default destination.
- `selectedLandmark`: optionally control the selected action card. IDs are exported in `world.ts`.
- `onMissionStart`: mission entry callback. Task 7 owns lesson state, API/events, outcome and rewards. Without a callback the card offers exploration.
- `pizza`: optional controlled four-slice geometry. The 2D/keyboard slice buttons invoke exactly the same callback as the mesh.
- `quality`: `auto` (default), `high`, `low`, `fallback`. Unsupported WebGL always starts with the map. Context creation/render failure or lost context switches to the map.
- `reducedMotion`: optional override, otherwise follows the OS preference live.
- `children`: DOM overlay slot within the world section. Overlays should provide their own positioned layout and focus management.

The default route renders `MissionAtlas`, which owns the fraction lesson and passes these controls into the exploration shell. The 2D replacement deliberately does not own or reset mission state: it continues invoking the provided mission callbacks. Avatar and camera motion live in refs and R3F render callbacks, not React state.

## Checks

Run `npm run test --workspace=@wiggle/web`, `npm run typecheck --workspace=@wiggle/web`, `npm run lint --workspace=@wiggle/web`, and `npm run build --workspace=@wiggle/web`. For the browser smoke suite, start the web server on port 3100, then run `node node_modules/@playwright/test/cli.js test` from `apps/web`. The suite uses installed Google Chrome on desktop and at 390 × 844, and saves screenshots in the ignored task evidence directory. Set the Playwright channel for another installed browser if Chrome is unavailable.
