# Original Numeria assets

Task 6 uses the approved procedural-geometry alternative. Blender was not present on the command path or in the standard `C:/Program Files/Blender Foundation` installation directory on this machine. No `.blend` or `.glb` files are claimed or fabricated.

The editable asset sources are the TypeScript/R3F modules in `apps/web/components/universe`:

| Asset | Source | Construction |
| --- | --- | --- |
| Numeria | `Numeria.tsx`, `world.ts` | Deterministic faceted sphere, vertex-colored regions, low-detail mountains, crystals and number blocks. |
| Fraction Forest | `Numeria.tsx` | Two instanced meshes for all tree trunks and crowns, with per-instance colors. |
| Child astronaut | `Astronaut.tsx` | Original helmet, visor, suit, backpack, antenna, limbs and contact shadow. |
| Mission pedestal and four-slice pizza | `Landmarks.tsx` | Eight-sided pedestal and four equal wedge meshes with separate selection targets. |
| Lexi beacon | `Landmarks.tsx` | Floating octahedral light with a thin orbital halo. |
| Locked worlds and space rocks | `OrbitingWorlds.tsx` | Low-detail icosahedra, a ring and geometric lock signs. |

All shapes, color decisions, layout, copy and geometry were authored for Wiggle. No source-site models, textures, fonts, icons, audio or other assets were downloaded. Primitive mathematical forms are used for symbols. System fonts avoid any font asset transfer.

## Runtime budget

- No model or texture downloads and no decoder workers. Procedural source travels in the deferred renderer chunk and benefits from normal JavaScript transfer compression.
- The tree geometry and materials are shared through instancing. The planet uses vertex colors without textures. No real-time shadow maps or postprocessing passes are used; the astronaut has a small contact-shadow disk.
- High quality uses 68 trees, 180 stars, capped DPR 1.5 and modest sphere detail. Low quality uses 36 trees, 90 stars, fewer rocks, reduced sphere detail and DPR 1.
- An automatic device check selects low detail or the map. A single frame-rate sample can lower detail after startup; motion never sets React state per frame.
- Motion uses frame-local refs and vector objects. Each supported action also has a DOM control. Reduced motion removes orbit and bob animations and completes camera changes immediately.

## Editing

Region anchor coordinates and palette live in `world.ts`. Distances and angles use scene units and radians. Numeria has radius 3. Modify component geometry and refresh the preview; no asset build step is needed. If a later production art pass adds Blender/glTF assets, retain the public `UniverseCanvas` API and 2D controls.
