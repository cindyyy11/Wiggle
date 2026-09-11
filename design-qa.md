# Wiggle final QA — 12 September 2026

final result: blocked

The local desktop/mobile hero experience passed visual and interaction QA. The overall production acceptance gate remains blocked: no live Vercel/Render/Supabase deployment, real household Auth/RLS run, Docker execution, or physical-device validation was performed. Those checks are not represented as passes.

## Comparison and provenance

Compared the supplied [Little Planet reference](https://signals.forwardfuture.com/astra-review/demos/little-planet/index.html) with the local Next production build at 1440 × 900 and 390 × 844. Captured the reference's globe, follow-camera, and journal states; captured Wiggle's globe/follow views, mission, simulation, pizza, fallback, completion and parent screens. Reference captures are visual QA evidence only, not application assets.

| State | Observed result |
| --- | --- |
| Desktop globe | Both compositions center a faceted spherical world in dark space with restrained stars, corner branding/view controls and a contextual action. Wiggle adds an original left destination list, larger serif title, geometric terrain and locked orbital worlds. Main mission CTA is legible and unobstructed. |
| Mobile globe | The globe sits between the title/HUD and a reachable destination/action area. Wiggle uses a directional pad, hop and zoom buttons; its five 44 px top controls fit without horizontal overflow. Parent entry was added after review exposed its absence. |
| Follow and movement | Globe/follow controls change the rendered view. Directional holds, keyboard movement, hop, orbit and zoom remain responsive in the automated browser. Screenshots confirm the closer original explorer/terrain composition. |
| Mission and simulation | Desktop uses a side panel; mobile uses a lower panel with visible pizza/slice controls above it. Standard, immediate stuck support, three predictions, selected slices and completion remain legible. Long gesture/support panels scroll within their own bounds. |
| Fallbacks | No-WebGL/reduced-motion maps retain destinations and slice buttons. Camera denial leaves the puzzle usable. All three slices can be selected by pointer, touch-style browser controls or keyboard. |
| Parent space | Responsive overview, meaningful mission history and practical insight are reachable from the child HUD. The dashboard requires PIN entry and hides again after lock/expiry. Memory data is clearly labelled as a connected sample. |

Original Wiggle geometry sources are documented in `assets/source/README.md`. Numeria, tree instances, crystals, number blocks, astronaut, pizza pedestal, Lexi beacon and locked worlds are authored TypeScript/R3F primitives. There are no borrowed reference models, textures, font files, icons, sounds, branding or prose. The MediaPipe package/model is a separate declared third-party inference dependency; it does not originate from the reference. Camera assets are fetched only after opt-in, and the browser test verified static GETs without frame uploads.

## Issues corrected in this QA pass

| Severity | Finding and correction | Evidence |
| --- | --- | --- |
| P1 | Household child requests previously used the hard-coded public demo child and did not propagate the authenticated session. The server now verifies the household, offers only owned explorers, and forwards the verified bearer via the same-origin mission proxy. | Household page/proxy unit tests; owned API repository tests. Live Auth/RLS is still blocked. |
| P1 | A failed household start could silently create local sample progress. Household play now fails closed, shows recovery, and preserves the start idempotency key across retry. | Mission regression test and proxy authorization tests. |
| P2 | Gemini's 5 s timeout outlasted the 4.5 s proxy / 5 s browser deadline. Mission proxy/client deadlines now allow the provider's fallback to finish; deployment pins Gemini's deadline to 3 s. | Connected browser timeout injection returns authored content through the real API. |
| P2 | Database seed omitted chunk mode, simulation weights and the correct mastery key. Aligned it with the tested memory seed; provided guarded operator household provisioning. | Seed parity test. SQL execution awaits Supabase. |
| P2 | Break preferences accepted 480 minutes while SQL permitted 120. API, local demo and UI now share the 5–120 range. | API boundary test and parent browser flows. |
| P2 | Parent mission control had no entry in the universe. Added the 44 px Parent HUD link and tested the child-to-parent navigation. | Both connected parent browser cases; desktop/mobile captures. |
| P2 | Credential-free development launched an API but left Next disconnected from it. The dev launcher now uses the local API by default and reads optional environment files. | Shared production browser loop; launcher help smoke check. |
| P2 | Default access logs could expose query data and lacked structured diagnostics. Supplied startup commands disable them; JSON middleware logs only method, route template, status, duration and request ID. Provider fallback logs only operation/error type. | API log-redaction tests. |

No unresolved P0/P1/P2 defect was observed in the tested local hero flow. Two initial camera tests failed because sandbox networking denied MediaPipe's static downloads; both passed with network permission. Two initial newly written hero tests used an unavailable selector; the selector was corrected and the entire suite rerun. No failing test was waived.

## Verification record

| Gate | Result |
| --- | --- |
| `pnpm lint` | Passed, including Ruff. |
| `pnpm typecheck` | Passed, including mypy. |
| `pnpm test` | Passed: 5 contract tests, 67 web tests, 93 API tests; 6 optional local-Supabase adapter cases skipped because the local stack/credentials are unavailable. |
| `pnpm build` | Passed; Next production build, 116 kB first-load JS on `/`, renderer deferred. |
| `python -m pytest -v`, `ruff check .`, `mypy app` in `apps/api` | Passed: 93 passed / 6 explicit Supabase skips, Ruff clear, mypy clear across 32 app files. |
| `pnpm test:e2e` | Passed: all 32 Chrome cases, no skips, across local/connected desktop/mobile projects. Includes the existing automatic-lock/PIN re-entry regression. |
| Deployment files | JSON/YAML parsed; root/project Vercel configurations match. Blueprint and SSR conventions checked against official docs. No provider-side validation/apply claimed. |
| Docker, local SQL/pgTAP, live RLS | Blocked: Docker daemon not running; Supabase CLI/stack and live credentials unavailable. |
| Live deployment and production smoke | Blocked: not published; provider/account authorization and configured credentials required at action time. |

Local runtime: Windows, Node 22.6.0, Chrome, FastAPI 0.135.3, Pydantic 2.11.7. The machine had pytest 8.2.0 and Uvicorn 0.44.0; the project declares pytest 8.4.2/Uvicorn 0.35.0 for clean installs. Container verification must confirm the declared clean environment. Browser camera tests use a synthetic stream with real local MediaPipe inference, not a child's hand or physical camera accuracy test.

Evidence is under `.superpowers/sdd/2026-09-11-wiggle-hybrid-universe/`: `reference-{desktop,mobile}.png`, `reference-follow-*`, `reference-journal-*`, `wiggle-globe-*`, `wiggle-follow-*`, the `browser-artifacts/` state captures, and the `playwright-report/` HTML report. These generated artifacts are intentionally ignored by Git.

## P3 differences and limits

Wiggle currently uses persistent destination navigation/progress instead of the reference's modal journal, a directional pad instead of an analog joystick, and no ambient soundtrack toggle. Procedural geometry is deliberately less detailed than the reference. These differences do not prevent the fraction journey, but full interaction parity with every reference feature is not claimed. The scene was checked on emulated mobile dimensions, not a representative physical mid-range device or a sustained frame-rate benchmark.

Queued evidence survives reload; the active puzzle selection does not resume after reload. Memory state resets on API restart. Parent break reminders are stored preferences, not a running scheduler. See the [demo runbook](docs/operations/demo-runbook.md) and [deployment smoke gate](docs/operations/deployment.md) before presenting or releasing.
