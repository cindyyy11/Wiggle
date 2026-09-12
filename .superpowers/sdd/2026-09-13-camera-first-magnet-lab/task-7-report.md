# Task 7 — saved living Science restoration

Restored the saved walkable Numeria-based Science planet selectively from stash 1b6cb65 and its third parent, using apply_patch. Stash intact. Four colorful lands, globe/follow/reset camera, avatar movement, proximity invitations, B/button entry, and the saved Animal Types / Colors Canyon / Life Cycle Garden sessions are present. Current Math and Learner Twin code preserved.

Magnet invitations mount the current camera-first MagnetLabMission with its existing four-object hand-only curriculum. Camera requests only on entry; denial/adult help/retry remain. The planet stays mounted and inert with movement paused under the modal. The saved session frame owns the single focus scope; close restores camera/location and Explore entry focus. Completion displays friendly feedback. Old manual MagnetAdventurePanel was not restored or made reachable.

## Verification

- Focused restoration suites: 4 files, 13 tests passed.
- Full web unit suite: 43 files, 192 tests passed.
- Web typecheck passed.
- Web lint passed (also included in final production build).
- Final production build passed using WIGGLE_DIST_DIR=.next-task7.
- Added focus-return regression: SciencePlanetCanvas suite 5/5 passed after correction.
- Targeted desktop/mobile browser baseline: 12/14 passed; only Escape focus return failed. Fixed the body-as-previous-focus edge case.
- Final camera browser rerun: 6/6 passed, covering entry-only automatic request, retry, Escape focus, and width fit on desktop/mobile. Combined with the unchanged globe/starter/carousel passing tests, all 14 targeted scenarios are verified.
- Desktop/mobile saved globe renders a real canvas, walks and switches camera, opens/closes camera-first lab while keeping canvas mounted. All three starter activities complete through discovery/matching; B entry, dismissal, focus containment and Escape work.
- git diff --check passed.

Commands run from workspace root unless noted:

    npm run test --workspace=@wiggle/web -- --reporter=dot
    npm run typecheck --workspace=@wiggle/web
    npm run lint --workspace=@wiggle/web
    $env:WIGGLE_DIST_DIR='.next-task7'; npm run build --workspace=@wiggle/web

Browser command from apps/web:

    $env:PLAYWRIGHT_EXTERNAL_SERVERS='1'; $env:PLAYWRIGHT_BASE_URL='http://127.0.0.1:3227'; npx playwright test tests/browser/magnet-lab-camera.spec.ts tests/browser/science-walkaround.spec.ts tests/browser/science-sessions.spec.ts tests/browser/planet-carousel.spec.ts --project=desktop --project=mobile --reporter=list --output=../../.superpowers/sdd/2026-09-13-camera-first-magnet-lab/task-7-browser-artifacts

Final rerun used only magnet-lab-camera.spec.ts with output task-7-camera-final.

## Preview and build isolation

Live: http://127.0.0.1:3227/?world=science — HTTP 200, PID 19000, exec session 20376.

Start command from apps/web:

    $env:WIGGLE_DIST_DIR='.next-task7'; $env:NEXT_IGNORE_INCORRECT_LOCKFILE='1'; node node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 3227

A separately supervised Wiggle dev server was overwriting .next during production validation. After verifying its process chain, stopped only Wiggle PIDs 36712/31420/39788; the supervisor recreated dev output. Added optional WIGGLE_DIST_DIR configuration and ignored .next-task7 output in git/lint to isolate this preview. Default dist remains .next. Restored generated next-env.d.ts and tsconfig.json to their original content. No cache deletion or dependency change. Separate Learner Twin dev process untouched.

One early broad browser attempt was stopped at HTTP 500 from mixed dev/production output. The old subject-worlds browser journey was adapted to invitations/four lands but not rerun in full after isolation; controller explicitly allowed narrowing to required Science/camera/carousel coverage. Unit Math/subject routing/accessibility coverage passes.

## Screenshots (visually inspected)

- task-7-browser-artifacts/science-walkaround-saved-S-63df0-umes-after-camera-first-lab-desktop/science-globe-desktop.png
- task-7-browser-artifacts/science-walkaround-saved-S-63df0-umes-after-camera-first-lab-mobile/science-globe-mobile.png
- task-7-camera-final/magnet-lab-camera-requests-df365-omatically-only-after-entry-desktop/camera-help-desktop.png
- task-7-camera-final/magnet-lab-camera-requests-df365-omatically-only-after-entry-mobile/camera-help-mobile.png

Globe screenshots show the saved colorful populated planet and movement controls. Camera-help layout is contained at both widths; equivalent baseline screenshots were inspected before the focus-only fix.

## Limits

No physical camera permission was accepted and no real hand was tested. Browser camera checks use denial mocks; existing deterministic frame tests cover the curriculum. Existing jsdom Three warnings and Next ESLint-plugin advisory remain non-failing. Minor HandStatusReporter confidence-copy consistency follow-up from Task5 was left untouched, as directed to prioritize restoration.
