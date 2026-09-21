# Wiggle final QA — 12 September 2026

## Local verification — 21 September 2026

result: local checks pass; the production acceptance gate below is still blocked.

**Regression found and fixed.** Commit `809cc91` (19 September) swapped Numeria over to region activities and unmounted `MissionAtlas`, the API-backed fractions mission. From then on a child could not complete a mission that reached the API, so the Twin and parent insights had no data, and `allowLocalFallback`, `childId` and `client` never reached Numeria. The mission logic now lives in `useFractionMission`; `MissionAtlas` is a thin wrapper around it, and Fraction Forest's Explore button starts the real mission inside the Numeria world. The other three regions keep their local field activities and do not feed the Twin.

Checked on this machine:

- `tsc`, ESLint, and the full web unit suite pass (80 files, 390 tests). API: 123 passed, 6 skipped (the live-Supabase cases). `next build` passes.
- API Docker image builds and runs as UID 10001 with a writable named volume; `/health` returns 200 with an `X-Request-ID`; the container healthcheck reports healthy; the SQLite PIN file is created and survives a restart. Not checked: an actual Render deployment.
- Browser, connected desktop and connected mobile (390 × 844): 8 of 8 each, on the final build. This covers the child mission, event persistence, the parent insight, replay after a lost acknowledgement, Gemini timeout fallback, camera denial and keyboard-only play.
- Four real problems found while verifying were fixed: the Wiggle companion launcher's wrapper covered the "Explore Numeria" button on phones and swallowed taps (`twinLauncher.module.css`); the "Back to Worlds" buttons drew a decorative "‹" that Chrome folded into their accessible name, so it read "‹ Back to Worlds" (marked decorative with CSS alt text in `mathPlanet.module.css` and `sciencePlanet.module.css`); the mission panel inherited dark navy text on its dark background, so its heading measured about 1.8:1 and the four learning-mode buttons 1.2–1.8:1 against a 4.5:1 minimum (`mission.module.css` now sets the panel's text colour and the mode buttons'); and `e2e/parent.spec.ts` skipped the child's "Back to my universe" step before opening Parent, which is deliberately blocked until the mission closes.
- The floating and walking astronauts were enlarged and made tappable (hover waves, tap hops or somersaults). The walking explorer now uses the same polished rig as the floating one (glossy visor with a smiling face and blinking eyes, gold trim, backpack, a real walking stride) and, once it has stopped for 0.4 s, turns to face the camera; that turn is drawn only, so the chase camera does not follow it round. Hover, tap, walking and stopping were exercised in Chrome with no page errors; this is not a physical-device check.

Not verified, and not represented as passing:

- Local browser projects: all twelve desktop spec files have passed since their last edit, and the local mobile project ran 30 passed, 3 skipped (the hover-contrast specs are desktop-only), 0 failed. That is not one continuous full-project run, and the mobile run predates the final astronaut change. After that change, universe, mission, activity-session-focus, hover-contrast, magnet-lab-camera and the two science spec files were re-run on desktop and pass. Ten specs had been stale against the current app and were updated to it rather than the app being changed back: locked worlds are a disabled "???" button, the splash logo is removed on auto-dismiss, controls were renamed ("View whole planet", "Place slice"), the camera panel words its states "Camera on · Point at a slice…" and "Camera access denied", and the quiz-dialog focus spec now uses Number Valley because Fraction Forest runs the real mission. The HUD contrast spec now measures the real Numeria HUD and mission panel against the surface behind each piece of text.
- Live Vercel, Render and Supabase deployment, and a real household Auth run. The 37-assertion pgTAP RLS suite was run and passes 37 of 37, but against a single container of Supabase's own Postgres 15.8 image (`supabase/postgres:15.8.1.135`, with its real `auth.users` and `auth.uid()`) after applying all three migrations, not a full local Supabase stack: GoTrue and PostgREST were not running, so the six live-Supabase repository cases (which need two signed-in parent tokens) were not run. No Supabase CLI is installed here.
- The browser suite serves the existing `.next` build and does not rebuild it. A run before this session's rebuild exercised stale code; the README and runbook now say to run `npm run build` first.

## Subject Worlds and Science Planet — Task 8 verification

result: pending/blocked in this isolated worktree

No Task 8 desktop or mobile screenshots were collected. The planned Playwright command for `subject-worlds.spec.ts` was started for the desktop and mobile projects, but it could not start the local Next server because `apps/web/node_modules/next/dist/bin/next` is absent. This is not recorded as a browser pass or as visual evidence.

| Planned state | Screenshots collected | Verification status |
| --- | --- | --- |
| Worlds selector and Science entry | None | Pending browser runtime. The authored journey uses the splash, labelled Worlds controls, and the Science `main` landmark. |
| Science Planet and Magnet Lab | None | Pending browser runtime. The authored journey completes all four classifications via labelled HTML buttons and checks that no token, reward, or claim copy appears. |
| Numeria entry | None | Pending browser runtime. Legacy journeys now use the shared splash → Worlds → Numeria helper before their existing mission assertions. |
| Desktop 1440 × 900 and mobile 390 × 844 | None | Pending browser runtime. The authored browser check asserts no document horizontal overflow and keeps the selected mobile topic card in the viewport. |
| Reduced motion and forced WebGL fallback | None | Pending browser runtime. The authored checks require `data-reduced-motion="true"`, complete Magnet Lab, and use the labelled Science map after WebGL is forced unavailable. |

Checks actually run in this worktree:

- `npm run lint --workspace=@wiggle/web` passed.
- The focused Science/Worlds Vitest command ran its independent suites: 4 files and 13 tests passed (`subjectRoute`, `scienceWorld`, `ScienceFallback`, and `MagnetLabMission`). Four dynamic Canvas/shell suites, including the new subject-world accessibility suite, could not collect because Vite could not resolve `next/dynamic`.
- `npm run typecheck --workspace=@wiggle/web` and `npm run build --workspace=@wiggle/web` both stopped with `next` not recognized (`ENOENT`).
- `npm run test:e2e --workspace=@wiggle/web -- tests/browser/subject-worlds.spec.ts --project=desktop --project=mobile` started the local API health server, then stopped before tests because the Next executable module was missing.
- The full `npm run test --workspace=@wiggle/web` run recorded 19 passing files / 78 passing tests. It also recorded 11 uncollected dynamic/proxy suites and one failed dependency-version baseline because the `next` package is absent; it is not a full-suite pass.
- The full desktop/mobile `npm run test:e2e --workspace=@wiggle/web -- --project=desktop --project=mobile` retry reached the same missing `next/dist/bin/next` blocker after the API health server started, before any browser test ran. A `--list` check did parse and list the 16 new desktop/mobile cases, but did not execute them or collect evidence.

The five future Science zones (Sink & Float Bay, pH Lab, Animal Arena, Colors Canyon, and Life Cycle Garden) and English/Bahasa Melayu remain visual coming-soon destinations. No QA evidence claims a lesson, activity, progress state, or reward for those destinations.

final result: blocked

The local desktop/mobile hero experience passes the refreshed final-fix checks below. The overall production acceptance gate remains blocked: no live Vercel/Render/Supabase deployment, real household Auth/RLS run, Docker execution, or physical-device validation was performed. Those checks are not represented as passes.

## Final whole-branch review fixes

The later whole-branch review identified C1, I1 and M1–M5. The final fix wave addresses all seven while retaining the external acceptance gates above:

- C1: upgraded Next from 15.4.4 to 15.5.24, with matching React/React DOM 19.1.9 and a regenerated frozen lockfile. The [official August security release](https://nextjs.org/blog/august-2026-security-release) identifies 15.5.24 as the patched Maintenance LTS version. Installed-version regression and frozen offline installation both pass.
- I1: completion now separates intended learning mode from bounded observed input. A recognized gesture must contribute a slice that remains selected; removed selections and unchanged grabs do not count. Button-only fallback credits visual effectiveness, and older evidence without an input source is treated conservatively. Component, queue, contract and API/domain regressions cover recognized/button input and replay.
- M1: simulation, selection response and persisted predictions now share three-decimal half-up precision. Memory and a repository simulating Postgres scalar rounding produce matching selection/completion values.
- M2: accepted abandonment closes the persisted session. Replay is idempotent, and later operations reconcile a failed status write before allowing more work. Tests reject new activity after abandonment and cover restart recovery.
- M3: parent copy explicitly calls the interval a saved break preference and discloses that automatic reminders are unavailable.
- M4: the runbook states that only stuck requests and mission completions currently update numerical learning state; timing and the other recorded context do not.
- M5: the completion screen offers an optional Reality Mission. Cancel/reopen preserves one start, and completion records a validated support lifecycle without a second fraction reward or twin update. The return-to-universe action remains available.

Fresh final-fix verification: `pnpm lint`, `pnpm typecheck`, `pnpm test` and `pnpm install --frozen-lockfile --offline --ignore-scripts` pass. Counts are 6 contract, 75 web and 108 API tests; the same 6 unavailable optional Supabase cases are explicitly skipped. The Next 15.5.24 production build passes with 118 kB first-load JS on `/`. The full `pnpm test:e2e` rerun passes all 36 Chrome cases across local/connected desktop/mobile projects in 2.1 minutes, with no skips. Both MediaPipe inference cases and the connected camera-denial/Reality Mission assertions pass. The build reports non-failing webpack cache-serialization and missing Next ESLint-plugin notices; the repository ESLint, TypeScript and API checks pass.

The first recovery check found incomplete Python formatting and an unsupported Testing Library selector option. The post-build lint check also required ignoring Next's generated `next-env.d.ts`; source lint rules were unchanged and lint was rerun successfully. The first browser run had 30 passes and 6 failures: two MediaPipe downloads were denied by sandbox networking, and four new test checks attempted a GET route the web proxy does not expose. The checks now read the existing local test API, and the entire suite was rerun with static-download permission. No failing case was waived. Detailed per-finding coverage is recorded in the ignored `final-fix-report.md` beside the original review.

Inspected the fresh connected completion and Reality Mission acknowledgement captures at 1440 × 900 and 390 × 844. The reward and return action remain legible; on mobile the optional offer uses the existing panel scroll to reach its button. Both viewport tests complete that action. The updated parent-copy assertions pass at both sizes. Refreshed evidence is in `browser-artifacts/` and `playwright-report/` under the existing ignored QA directory.

## Review correction — round 1

The initial desktop reference capture still showed its loading overlay, and the initial follow captures exposed low-contrast HUD text over bright terrain. The first QA record incorrectly treated that evidence as clean. Both P2 findings are now corrected and the matched views have been inspected again.

- **R1:** `capture-reference.mjs` now waits for both “Growing a little world” and “One moment of wonder” to be hidden, a visible canvas and the Follow control, then 1.6 seconds for the initial globe camera to settle. Recaptured `reference-desktop.png` and `reference-mobile.png` show the loaded globe, not the overlay. Follow/journal reference captures were refreshed in the same run.
- **R2:** A shared dark navy, 95%-opaque backing now protects the world title/subtitle, mission progress and future-world labels in follow and mission views. Globe mode keeps the existing open HUD. The new desktop/mobile browser cases composite the rendered backing over pure white and require every affected text color to retain at least 4.5:1 contrast. Fresh `wiggle-follow-*` and `wiggle-mission-*` captures confirm placement/readability and no horizontal overflow; the test also saves `follow-hud.png` and `mission-hud.png`.
- **M1:** The parent E2E now records an authenticated baseline, relocks, completes its own mission and requires the count and history length to increase by exactly one. Its newest mastery point must match that completion response. Earlier tests' shared history cannot satisfy these assertions by itself.

The frontend refinement guidance kept this to small, state-specific surfaces without changing the original geometry, palette, copy, controls or page hierarchy. Its mechanical detector returned no findings; the screenshots supplied the visual check.

## Comparison and provenance

Compared the supplied [Little Planet reference](https://signals.forwardfuture.com/astra-review/demos/little-planet/index.html) with the local Next production build at 1440 × 900 and 390 × 844. Captured the reference's globe, follow-camera, and journal states; captured Wiggle's globe/follow views, mission, simulation, pizza, fallback, completion and parent screens. Reference captures are visual QA evidence only, not application assets.

| State | Observed result |
| --- | --- |
| Desktop globe | Both loaded compositions center a faceted spherical world in dark space with restrained stars and corner branding/view controls. The reference puts its region title at bottom left and its action at bottom center; Wiggle uses a top-left serif title, persistent left destination list and bottom-right mission CTA. Wiggle's original geometric terrain and locked orbital worlds remain distinct. Main mission CTA is legible and unobstructed. |
| Mobile globe | The globe sits between the title/HUD and a reachable destination/action area. Wiggle uses a directional pad, hop and zoom buttons; its five 44 px top controls fit without horizontal overflow. Parent entry was added after review exposed its absence. |
| Follow and movement | Globe/follow controls change the rendered view. Directional holds, keyboard movement, hop, orbit and zoom remain responsive in the automated browser. Refreshed screenshots confirm the closer original explorer/terrain composition and the corrected dark HUD backings over gold/purple terrain. |
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

The initial local QA after R1/R2 did not detect the dependency and attribution defects found by the later whole-branch review; those corrections are recorded in the final-fix section above. Two initial camera tests failed because sandbox networking denied MediaPipe's static downloads; both passed with network permission. Two initial newly written hero tests used an unavailable selector; the selector was corrected and the entire suite rerun. No failing test was waived.

## Original Task 10 verification record

| Gate | Result |
| --- | --- |
| `pnpm lint` | Passed, including Ruff. |
| `pnpm typecheck` | Passed, including mypy. |
| `pnpm test` | Passed: 5 contract tests, 67 web tests, 93 API tests; 6 optional local-Supabase adapter cases skipped because the local stack/credentials are unavailable. |
| `pnpm build` | Passed; Next production build, 116 kB first-load JS on `/`, renderer deferred. |
| `python -m pytest -v`, `ruff check .`, `mypy app` in `apps/api` | Passed: 93 passed / 6 explicit Supabase skips, Ruff clear, mypy clear across 32 app files. |
| `pnpm test:e2e` | Passed after review fixes: all 34 Chrome cases, no skips, across local/connected desktop/mobile projects. Includes both new HUD-contrast cases, the strengthened parent history assertions and the existing automatic-lock/PIN re-entry regression. |
| Deployment files | JSON/YAML parsed; root/project Vercel configurations match. Blueprint and SSR conventions checked against official docs. No provider-side validation/apply claimed. |
| Docker, local SQL/pgTAP, live RLS | Blocked: Docker daemon not running; Supabase CLI/stack and live credentials unavailable. |
| Live deployment and production smoke | Blocked: not published; provider/account authorization and configured credentials required at action time. |

Local runtime: Windows, Node 22.6.0, Chrome, FastAPI 0.135.3, Pydantic 2.11.7. The machine had pytest 8.2.0 and Uvicorn 0.44.0; the project declares pytest 8.4.2/Uvicorn 0.35.0 for clean installs. Container verification must confirm the declared clean environment. Browser camera tests use a synthetic stream with real local MediaPipe inference, not a child's hand or physical camera accuracy test.

Evidence is under `.superpowers/sdd/2026-09-11-wiggle-hybrid-universe/`: loaded `reference-{desktop,mobile}.png`, `reference-follow-*`, `reference-journal-*`, `wiggle-globe-*`, `wiggle-follow-*`, `wiggle-mission-*`, the `browser-artifacts/` state captures, and the `playwright-report/` HTML report. All globe/follow/mission comparison files were refreshed after the review corrections. These generated artifacts are intentionally ignored by Git.

## P3 differences and limits

Wiggle currently uses persistent destination navigation/progress instead of the reference's modal journal, a directional pad instead of an analog joystick, and no ambient soundtrack toggle. Procedural geometry is deliberately less detailed than the reference. These differences do not prevent the fraction journey, but full interaction parity with every reference feature is not claimed. The scene was checked on emulated mobile dimensions, not a representative physical mid-range device or a sustained frame-rate benchmark.

Queued evidence survives reload; the active puzzle selection does not resume after reload. Memory state resets on API restart. Parent break reminders are stored preferences, not a running scheduler. See the [demo runbook](docs/operations/demo-runbook.md) and [deployment smoke gate](docs/operations/deployment.md) before presenting or releasing.

No child learning-constellation screen is reachable; its API tool returns a fixed label. Browser-local evidence is not synchronized into household history. Lighthouse, mutation/branch-coverage commands and sustained frame-rate measurement remain unperformed. The full product specification and production readiness are not claimed by the local tests.
