# Deployment and verification

This repository is configured for Vercel (web), Render (API), and Supabase (Auth/database). Configuration is committed; no production resources were created or published during Task 10. The current evidence and unverified gates are in [design-qa.md](../../design-qa.md).

## Local production check

Use Node 24.21+, npm 11.6+, Python 3.12+, and Chrome. From the repository root:

```sh
npm ci
python -m pip install -e "apps/api[dev]"
npm run lint
npm run typecheck
npm run test
npm run build
npm run test:e2e
```

The browser command starts and stops three fresh local processes: Next production builds on ports 3100 (browser-local demo) and 3101 (connected demo), plus the test-only API on 8101. It does not use provider credentials. The test API injects a Gemini transport timeout into the real provider class, while using the real routes, event replay, twin updates, and parent PIN service. Its diagnostic route lives under `tests/` and is excluded from the Docker image. Close conflicting local listeners before running. `PLAYWRIGHT_EXTERNAL_SERVERS=1` is only for an operator supplying those same test servers.

Browser reports, traces on failure, and screenshots are written below `.superpowers/sdd/2026-09-11-wiggle-hybrid-universe/`. The API suite includes six optional local-Supabase cases; skips do not prove live RLS isolation.

## Supabase

1. After approval to create external resources, create a project in the chosen region. Record its project URL and publishable key in the provider dashboards.
2. Apply both SQL files in `supabase/migrations/` in timestamp order. The repository uses imperative migrations. With a configured Supabase CLI, discover the installed commands using `supabase --help`, `supabase db --help`, and `supabase migration --help` before linking/pushing. Review the target project and migration diff before applying anything.
3. Configure Auth's Site URL to the exact Vercel production origin. Add only the specific development/staging redirect origins needed. The supplied local `config.toml` uses localhost and must not be treated as the production Auth configuration.
4. Create each household account through Supabase Auth using a real email/password under the operator's control. Confirm email as required by the project's policy. Do not use `seed.sql`: its `auth.users` entries are local test identities without usable passwords.
5. Review `supabase/provision-household.sql`, replace its two sentinel UUIDs with the Auth user ID and a fresh child UUID, set the explorer name, then run it in that project's SQL editor. This adds an owned profile, child, initial twin and the supported fraction mission. Reusing the same child UUID is safe; existing progress is not reset. Repeat for a second test household to verify isolation. Onboarding is operator-assisted in this MVP.
6. Run `supabase/tests/rls.test.sql` against a disposable Supabase database with pgTAP. It uses a transaction and rolls back its fixtures; confirm all 37 assertions. Configure the optional repository tests as described in `apps/api/tests/repositories/conftest.py` and require all six live adapter cases to pass before a production release.

All public tables already have RLS and ownership policies. The API authenticates the bearer with Supabase Auth and uses that same bearer for PostgREST reads/writes. No service-role key is needed at runtime. The child page validates the household, reads owned explorers, and the mission proxy forwards only that verified server session. A configured household failure never becomes a public demo session.

## Render API

Apply the root `render.yaml` as a Blueprint only after reviewing the account, region, plan and deployment authorization. It defines a paid Starter Docker service, one instance, one Uvicorn worker, a 1 GB persistent PIN disk, `/health`, and disabled automatic deployment. Choose the desired region before resource creation. The Docker build context is `apps/api`; only application source and `pyproject.toml` enter the image.

| Render value | Setting |
| --- | --- |
| `WIGGLE_REPOSITORY_BACKEND` | `supabase` |
| `SUPABASE_URL` | Project URL |
| `SUPABASE_ANON_KEY` | Project publishable key; legacy variable name is retained by the API |
| `WIGGLE_PIN_STORE_PATH` | `/var/lib/wiggle/parent-pin.sqlite` |
| `WIGGLE_ALLOWED_ORIGINS` | Exact Vercel origin(s), comma separated; no wildcard |
| `WIGGLE_AI_PROVIDER` | `local` initially; `gemini` after adding its key and testing |
| `GEMINI_API_KEY` | Server-only dashboard secret |
| `GEMINI_MODEL` | `gemini-2.5-flash`, or an available tested model |
| `GEMINI_TIMEOUT_SECONDS` | `3` |

The API listens on Render's `PORT` and `0.0.0.0`. Confirm the image's UID 10001 can write the mounted PIN directory before accepting traffic. Its SQLite attempts/tickets must survive a restart. Do not scale to multiple workers or hosts: mission orchestration currently uses one process lock, and PIN throttling uses one local persistent disk. Deleting that disk loses throttle/ticket state. Supabase keeps PIN hashes and learning records; the disk keeps attempt/ticket state.

The browser normally calls same-origin Next routes, so cross-origin API access is unnecessary. Explicit CORS origins support direct diagnostic clients; CORS is not authentication. Do not set `NEXT_PUBLIC_API_URL` for household deployments.

When Docker is available, build with `docker build -t wiggle-api -f apps/api/Dockerfile apps/api`; run with a private environment file and a writable named volume on `/var/lib/wiggle`. Never copy environment files or credentials into an image. Docker execution was unavailable on the Task 10 machine.

## Vercel web

Import the repository with **Root Directory `apps/web`**, Next.js framework, and include source files outside the root directory so `packages/contracts` is available. Set Node 24. `apps/web/vercel.json` is the active project configuration; the root `vercel.json` is its identical review copy. Keep them in sync. Install/build commands deliberately return to the workspace root and use `npm ci` with the committed npm lockfile.

| Vercel value | Setting |
| --- | --- |
| `WIGGLE_API_URL` | Render HTTPS origin; server-only |
| `NEXT_PUBLIC_SUPABASE_URL` | Same Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Same browser-safe publishable key |
| `NEXT_PUBLIC_API_URL` | Leave unset |

Set both public Supabase values before building; changing them requires a rebuild. Keep `SUPABASE_SERVICE_ROLE_KEY`, database passwords and `GEMINI_API_KEY` out of the web project entirely. Use separate values/projects for previews. Proxies have bounded timeouts and private/no-store responses. Parent PIN tickets are HttpOnly, same-site cookies and expire after 15 minutes.

## Production smoke gate

Use a dedicated test household and one other household; do not use real child observations for a smoke test. Record deployment URLs, commit, time, viewport, test account alias, and results without tokens or PINs.

1. `GET <API>/health` returns `{ "status": "ok" }` with an `X-Request-ID`. This proves process liveness only, not database/provider reachability.
2. Sign in at `<WEB>/parent/sign-in?next=/`, select an owned explorer, complete a fraction mission, then set/enter the parent PIN and confirm that the completed mission and mastery history appear. The authored sample outcome is 92% in demo mode; a household's correct three-of-four answer is recorded as 100% for that single question.
3. Confirm the other household cannot read the first child's twin, events or parent insight, and cannot append events for that child. Run the SQL RLS suite and the optional Supabase adapter tests; API memory tests alone do not satisfy this gate.
4. Deny camera permission; complete with buttons. Test 390 × 844 touch controls and a reduced-motion/no-WebGL fallback. Test household expiry and a temporary API interruption, then verify same-ID evidence replay after reconnection.
5. With Gemini selected, ask Lexi for a hint and inspect provider logs. For a controlled failure test use a staging deployment; verify authored content is returned and a `provider_fallback` event appears. Restore valid provider settings afterwards.
6. Lock and re-enter the parent space. Confirm wrong-PIN throttling still applies across an API restart, and that tickets are denied after explicit lock or expiry.
7. Inspect JSON `http_request`/`provider_fallback` logs: route template, status, duration and generated request ID only. No query strings, child IDs/names, request bodies, PINs, bearer tokens, camera frames, or provider error bodies. Uvicorn access logging is disabled in the supplied Docker/startup commands.

Do not declare production passed until every step is recorded. Deployment, real Auth, live Gemini, container volume ownership and live RLS were not verified during Task 10.

Configuration references checked during this task: [Vercel monorepos](https://vercel.com/docs/monorepos), [Render Blueprint specification](https://render.com/docs/blueprint-spec), [Supabase server clients](https://supabase.com/docs/guides/auth/server-side/creating-a-client), and [Supabase changelog](https://supabase.com/changelog).
