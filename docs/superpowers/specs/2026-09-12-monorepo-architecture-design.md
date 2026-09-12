# Wiggle Monorepo Architecture Design

## Decision

Wiggle will use **npm workspaces** and **Turborepo**. npm is selected because it is familiar to contributors and supported broadly by editors, CI providers, and deployment platforms. Turborepo provides task orchestration and caching across the JavaScript workspace.

The repository will maintain strong dependency discipline through explicit package manifests, committed lockfiles, `npm ci` in CI, workspace-boundary linting, and API contract generation. Python dependencies remain independent from npm and are owned by the API application.

## Repository Layout

```text
Wiggle/
├─ apps/
│  ├─ web/                         # Next.js child and parent experiences
│  └─ api/                         # FastAPI application and Python environment
│     ├─ app/
│     │  ├─ domain/                # Pure learner and mission rules
│     │  ├─ application/           # Use cases and orchestration
│     │  ├─ infrastructure/        # Supabase, Gemini, and provider adapters
│     │  └─ routes/                # HTTP endpoints and schema binding
│     ├─ tests/
│     ├─ pyproject.toml
│     └─ uv.lock
├─ packages/
│  ├─ contracts/                   # Generated API client/types and event schemas
│  ├─ ui/                          # Reusable non-3D React primitives
│  ├─ config/                      # Shared ESLint, TypeScript, and formatting config
│  └─ test-utils/                  # Shared JavaScript fixtures and test helpers
├─ supabase/
│  ├─ migrations/
│  ├─ seed.sql
│  └─ tests/
├─ tooling/
│  ├─ scripts/
│  └─ docker/
├─ docs/
│  ├─ architecture/
│  ├─ operations/
│  └─ superpowers/
├─ .github/workflows/
├─ package.json
├─ package-lock.json
├─ turbo.json
└─ README.md
```

## Workspace Boundaries

`apps/web` may import only published workspace packages, notably `@wiggle/contracts`, `@wiggle/ui`, `@wiggle/config`, and `@wiggle/test-utils`. It must not import FastAPI source code or reach into another package's private directories.

`apps/api` owns its Python environment, domain rules, application services, routes, and infrastructure adapters. It does not import from the JavaScript workspace. Supabase is an auth and persistence adapter; it is not the owner of learner-state business rules.

`packages/contracts` is the only shared API boundary. FastAPI defines the OpenAPI schema, CI validates and exports it, and generated TypeScript types/client code are published inside this package. The web app consumes this package rather than handwritten duplicate request and response types.

`packages/ui` contains conventional reusable React UI only. The 3D world, mission mechanics, gestures, and child-learning features stay within feature folders in `apps/web`, avoiding an unbounded shared-components package.

## Dependency Discipline

- Every package declares every dependency it imports, including development-only tools.
- The root `package.json` owns repository scripts and common developer tooling; apps and packages own their runtime dependencies.
- npm workspaces are declared explicitly in the root manifest. Internal dependencies use workspace versions and package export maps restrict public imports.
- `package-lock.json` is committed. Local and CI installs use `npm ci`; CI fails if the manifest and lockfile diverge.
- Dependency updates run through a dedicated, reviewed change. No ad-hoc lockfile edits.
- Turbo defines inputs and outputs for `lint`, `typecheck`, `test`, `build`, `codegen`, and `e2e`, so caches are invalidated when a source file, generated contract, environment schema, or dependent package changes.
- The API uses `pyproject.toml` plus `uv.lock`; its CI install is frozen/locked. JavaScript and Python lockfiles remain separate.

## Application Data Flow

1. The web app sends a typed request or interaction event through `@wiggle/contracts`.
2. FastAPI validates it at the route boundary and passes it to an application service.
3. The application service applies pure domain rules, updates learner state through the persistence adapter, and returns a typed decision.
4. Infrastructure adapters call Supabase, Gemini, or other providers behind interfaces. Provider behavior cannot mutate learner state directly.
5. The client displays the decision and records subsequent interaction events with idempotency keys.

FastAPI owns all learner-state mutations. Gemini failure returns deterministic local guidance. Gesture permission denial retains pointer, touch, and keyboard controls. A WebGL failure uses a 2D mission fallback.

## Testing and CI

Tests are colocated with the feature or domain module they verify. API/domain tests reside in `apps/api/tests`; browser integration and end-to-end tests reside in `apps/web/e2e` or close to their relevant web feature. Contract tests verify generated client compatibility. Supabase migrations and RLS policies have database-specific tests.

CI runs, in dependency order:

1. `npm ci` and locked Python dependency installation.
2. API OpenAPI export and TypeScript contract generation, failing on uncommitted generated output.
3. Lint, formatting validation, type checks, unit tests, migrations/RLS tests, and package builds through Turbo.
4. Browser end-to-end tests for desktop and mobile critical journeys.

## Non-goals

- No cross-language shared domain package; the OpenAPI contract is the boundary.
- No shared package for product-specific 3D or lesson feature code.
- No dependency hoisting or implicit imports as a supported development practice.
- No unreviewed provider access from browser components or direct learner-state mutation by AI providers.
