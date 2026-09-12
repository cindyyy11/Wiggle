# Wiggle NPM Monorepo Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a reproducible npm-workspace and Turbo foundation for the Next.js web app, FastAPI service, typed API contracts, and automated quality gates.

**Architecture:** npm manages only the JavaScript workspace (`apps/web` and `packages/*`); FastAPI owns its isolated Python project and `uv.lock` in `apps/api`. FastAPI exports OpenAPI, and a generated `@wiggle/contracts` package is the only API type boundary consumed by the web app. Turbo caches JavaScript quality tasks while a root code-generation command verifies contract output before Turbo runs.

**Tech Stack:** npm workspaces, npm package lock, Turborepo, Next.js App Router, TypeScript, Vitest, FastAPI, Pydantic, pytest, Ruff, mypy, uv, OpenAPI, openapi-typescript, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-09-12-monorepo-architecture-design.md`

## Global Constraints

- Use npm workspaces and `package-lock.json`; do not introduce pnpm, Yarn, or their lockfiles.
- Every JavaScript package explicitly declares every dependency it imports; internal imports use package export maps only.
- Use `npm ci` in CI and reject lockfile drift.
- Keep the Python environment inside `apps/api` with `pyproject.toml` and `uv.lock`; use `uv sync --frozen` in CI.
- FastAPI owns OpenAPI; generated TypeScript contract files are committed and checked for drift.
- `apps/web` imports API types/client code only from `@wiggle/contracts`, never from FastAPI source.
- Place unit tests next to the application feature/module they cover; reserve `apps/web/e2e` for browser journeys.
- Do not put secrets in the repository. Commit `.env.example` files with names only.

---

## Planned File Structure

```text
.github/workflows/verify.yml                    CI quality pipeline
.editorconfig                                    cross-editor whitespace rules
.gitignore                                       generated files, environment files, dependency stores
.npmrc                                           npm reproducibility and peer-dependency rules
.nvmrc                                           pinned Node major version
.env.example                                     root public setup-variable names
package.json                                     root workspaces, tools, orchestration scripts
package-lock.json                                committed npm dependency graph
turbo.json                                       cached JavaScript task graph
apps/api/pyproject.toml                          Python dependencies and tool configuration
apps/api/uv.lock                                 locked Python dependency graph
apps/api/app/main.py                             FastAPI factory and health route
apps/api/app/schemas/health.py                   API response model
apps/api/app/export_openapi.py                   deterministic schema export command
apps/api/tests/test_health.py                    route and OpenAPI tests
apps/web/package.json                            web runtime and web scripts
apps/web/app/page.tsx                            minimum verified application route
apps/web/app/page.test.tsx                       web route test
apps/web/e2e/.gitkeep                            reserved browser-test directory
packages/config/tsconfig.base.json               strict shared compiler settings
packages/config/eslint.base.mjs                  shared lint rules and import boundaries
packages/contracts/openapi.json                  committed FastAPI OpenAPI input
packages/contracts/src/generated/api.d.ts        generated public API declarations
packages/contracts/src/index.ts                  contracts public export surface
packages/contracts/src/index.test.ts             generated contract import test
packages/ui/src/index.ts                         minimal reusable UI public surface
packages/test-utils/src/index.ts                 shared test-helper public surface
tooling/scripts/generate-api-contracts.mjs       runs OpenAPI export and TypeScript generation
tooling/scripts/verify-workflow.mjs              verifies CI command coverage
docs/superpowers/plans/2026-09-11-wiggle-hybrid-universe.md  npm command correction
```

### Task 1: Establish the npm Workspace and Reproducible Root Tooling

**Files:**
- Create: `package.json`, `turbo.json`, `.npmrc`, `.nvmrc`, `.editorconfig`, `.env.example`
- Modify: `.gitignore`, `README.md`
- Create: `packages/config/package.json`
- Remove: `.pnpm-store/` (untracked local cache only)
- Generate and commit: `package-lock.json`

**Interfaces:**
- Produces root commands `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build`, `npm run codegen`, and `npm run verify`.
- Produces npm workspace discovery for `apps/web` and `packages/*`; `apps/api` remains outside the npm workspace.

- [ ] **Step 1: Write root configuration and the failing workspace-discovery check**

Create this root manifest:

```json
{
  "name": "wiggle",
  "private": true,
  "packageManager": "npm@11.6.2",
  "workspaces": ["apps/web", "packages/*"],
  "scripts": {
    "build": "turbo run build",
    "codegen": "node tooling/scripts/generate-api-contracts.mjs",
    "lint": "turbo run lint",
    "test": "turbo run test",
    "typecheck": "turbo run typecheck",
    "verify": "npm run codegen && turbo run lint typecheck test build"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "turbo": "^2.0.0",
    "typescript": "^5.0.0"
  },
  "engines": { "node": ">=22.0.0 <23" }
}
```

Set `.npmrc` to `engine-strict=true`, `legacy-peer-deps=false`, `save-exact=true`, and `package-lock=true`; set `.nvmrc` to `22`. Make `.gitignore` ignore `node_modules/`, `.next/`, `.turbo/`, `.pnpm-store/`, `.env*` except `.env.example`, Python cache/virtualenv files, and test reports. Add temporary `packages/config/package.json` with name `@wiggle/config`, version `0.0.0`, and `private: true`.

- [ ] **Step 2: Verify workspace discovery and Node engine enforcement**

Run:

```powershell
npm install
npm query .workspace
npm ls --workspaces --depth=0
```

Expected: `@wiggle/config` appears as a workspace and `package-lock.json` is created. Use a Node version outside `>=22 <23` once to confirm npm rejects it, then return to Node 22.

- [ ] **Step 3: Implement Turbo task definitions and baseline tooling checks**

Create `turbo.json`: `lint`, `typecheck`, and `test` have empty outputs; `build` depends on `^build` and outputs `apps/web/.next/**`; all tasks depend on their applicable upstream workspace tasks. Root scripts invoke only `turbo run`, without shell globs.

Run:

```powershell
npm ci
npm exec turbo -- --version
npm ls --workspaces --depth=0
```

Expected: npm restores exactly the lockfile dependency graph, Turbo is available, and npm lists the configured workspace. The first actual lint/typecheck/test run happens after Tasks 3–4 add the corresponding package scripts.

- [ ] **Step 4: Remove the obsolete pnpm store after confirming scope**

Run:

```powershell
git status --short -- .pnpm-store
```

Expected: only `?? .pnpm-store/` is reported. Remove exactly `C:\\Users\\User\\Wiggle\\.pnpm-store` with `Remove-Item -LiteralPath`; do not remove another path.

- [ ] **Step 5: Commit**

```powershell
git add package.json package-lock.json turbo.json .npmrc .nvmrc .editorconfig .env.example .gitignore README.md packages/config/package.json
git commit -m "chore: establish npm workspace foundation"
```

### Task 2: Add an Isolated FastAPI Service with a Verified OpenAPI Export

**Files:**
- Create: `apps/api/pyproject.toml`, `apps/api/app/__init__.py`, `apps/api/app/main.py`, `apps/api/app/export_openapi.py`
- Create: `apps/api/app/schemas/__init__.py`, `apps/api/app/schemas/health.py`, `apps/api/tests/test_health.py`, `apps/api/.env.example`
- Generate and commit: `apps/api/uv.lock`, `packages/contracts/openapi.json`

**Interfaces:**
- Produces `create_app() -> FastAPI`, `GET /health -> HealthResponse`, and `python -m app.export_openapi --output PATH`.
- Produces an OpenAPI document with title `Wiggle API`, version `0.1.0`, and a health schema containing `status: Literal["ok"]`.

- [ ] **Step 1: Write failing API tests**

```python
from fastapi.testclient import TestClient
from app.main import create_app

def test_health_returns_ok() -> None:
    response = TestClient(create_app()).get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}

def test_openapi_exposes_health_schema() -> None:
    schema = create_app().openapi()
    assert schema["info"] == {"title": "Wiggle API", "version": "0.1.0"}
    assert "/health" in schema["paths"]
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```powershell
uv run --directory apps/api pytest tests/test_health.py -q
```

Expected: FAIL because `app.main` does not exist.

- [ ] **Step 3: Implement the app factory, response schema, and export command**

Implement the public boundary exactly:

```python
# app/schemas/health.py
from typing import Literal
from pydantic import BaseModel

class HealthResponse(BaseModel):
    status: Literal["ok"]

# app/main.py
from fastapi import FastAPI
from app.schemas.health import HealthResponse

def create_app() -> FastAPI:
    app = FastAPI(title="Wiggle API", version="0.1.0")

    @app.get("/health", response_model=HealthResponse)
    def health() -> HealthResponse:
        return HealthResponse(status="ok")

    return app

app = create_app()
```

`export_openapi.py` must parse required `--output`, serialize `create_app().openapi()` with two-space indentation and trailing newline, and create its parent directory. Put FastAPI, Pydantic, and Uvicorn in runtime dependencies; put pytest, Ruff, and mypy in development dependencies; set Python `>=3.12`.

- [ ] **Step 4: Run API quality and export checks**

Run:

```powershell
uv lock --directory apps/api
uv run --directory apps/api pytest -q
uv run --directory apps/api ruff check .
uv run --directory apps/api mypy app
uv run --directory apps/api python -m app.export_openapi --output ..\\..\\packages\\contracts\\openapi.json
```

Expected: all commands exit zero and the generated schema contains `/health`.

- [ ] **Step 5: Commit**

```powershell
git add apps/api packages/contracts/openapi.json
git commit -m "feat: add FastAPI foundation and OpenAPI export"
```

### Task 3: Generate and Verify the Public TypeScript Contract Package

**Files:**
- Create: `packages/contracts/package.json`, `packages/contracts/tsconfig.json`, `packages/contracts/src/index.ts`, `packages/contracts/src/index.test.ts`
- Create: `tooling/scripts/generate-api-contracts.mjs`
- Generate and commit: `packages/contracts/openapi.json`, `packages/contracts/src/generated/api.d.ts`
- Modify: root `package.json` and `package-lock.json`

**Interfaces:**
- Produces `@wiggle/contracts` public type exports `paths` and `components`.
- Produces `npm run codegen`, which regenerates `openapi.json` and `src/generated/api.d.ts` from FastAPI.

- [ ] **Step 1: Write the failing contract import test**

```ts
import type { paths } from "@wiggle/contracts";

it("exposes the FastAPI health path", () => {
  type HealthPath = paths["/health"]["get"];
  const operation: HealthPath | undefined = undefined;
  expect(operation).toBeUndefined();
});
```

- [ ] **Step 2: Verify failure before generation exists**

Run:

```powershell
npm run test --workspace=@wiggle/contracts
```

Expected: FAIL because the package cannot resolve its public type exports.

- [ ] **Step 3: Implement generation and a closed public surface**

Add `openapi-typescript` as a root development dependency. The generator script executes, in order:

```text
uv run --directory apps/api python -m app.export_openapi --output packages/contracts/openapi.json
npx openapi-typescript packages/contracts/openapi.json -o packages/contracts/src/generated/api.d.ts
```

Set the package export map to expose only `.` and `./generated`; implement its public source as:

```ts
export type { components, paths } from "./generated/api";
```

Configure local strict TypeScript and Vitest with these package scripts: `"typecheck": "tsc --noEmit"` and `"test": "vitest run"`. Do not hand-edit generated files.

- [ ] **Step 4: Run contract and drift checks**

Run:

```powershell
npm run codegen
npm run typecheck --workspace=@wiggle/contracts
npm run test --workspace=@wiggle/contracts
git diff --exit-code -- packages/contracts/openapi.json packages/contracts/src/generated/api.d.ts
```

Expected: tests/typecheck pass; after generation the final command exits zero.

- [ ] **Step 5: Commit**

```powershell
git add package.json package-lock.json packages/contracts tooling/scripts/generate-api-contracts.mjs
git commit -m "feat: generate typed API contracts"
```

### Task 4: Create the Web App and Enforce Shared-Package Boundaries

**Files:**
- Create: `apps/web/package.json`, `apps/web/next.config.ts`, `apps/web/tsconfig.json`, `apps/web/vitest.config.ts`
- Create: `apps/web/app/layout.tsx`, `apps/web/app/page.tsx`, `apps/web/app/page.test.tsx`, `apps/web/e2e/.gitkeep`
- Create: `packages/config/tsconfig.base.json`, `packages/config/eslint.base.mjs`, `packages/config/tests/forbidden-api-import.ts`
- Create: `packages/ui/package.json`, `packages/ui/src/index.ts`, `packages/test-utils/package.json`, `packages/test-utils/src/index.ts`

**Interfaces:**
- Produces a Next.js route with heading `Wiggle` and a typed import from `@wiggle/contracts`.
- Produces export-mapped `@wiggle/ui` and `@wiggle/test-utils` packages ready for deliberate shared code.
- Produces lint rules rejecting FastAPI imports, relative imports that escape an app/package root, and deep imports into `@wiggle/*` packages.

- [ ] **Step 1: Write a failing web-route test**

```tsx
import { render, screen } from "@testing-library/react";
import Page from "./page";

it("renders the Wiggle foundation", () => {
  render(<Page />);
  expect(screen.getByRole("heading", { name: "Wiggle" })).toBeVisible();
});
```

`page.tsx` must include `import type { paths } from "@wiggle/contracts";` and use it in a local type alias so the test build verifies the approved boundary.

- [ ] **Step 2: Run the test to verify failure**

Run:

```powershell
npm run test --workspace=@wiggle/web
```

Expected: FAIL because the web workspace and route do not exist.

- [ ] **Step 3: Implement strict web and shared-package configuration**

Set `@wiggle/web` dependencies to explicit Next.js, React, React DOM, and `@wiggle/contracts: "0.0.0"` versions; declare its test/lint tooling in `devDependencies` and define `"build": "next build"`, `"lint": "eslint . --max-warnings=0"`, `"test": "vitest run"`, and `"typecheck": "tsc --noEmit"`. Set `strict: true`, `noUncheckedIndexedAccess: true`, `exactOptionalPropertyTypes: true`, and `moduleResolution: "bundler"`.

Use each shared package's `exports` field to expose only `./src/index.ts`. `packages/ui` and `packages/test-utils` must only contain `export {};` at this stage; product, 3D, and mission code stays out of them.

- [ ] **Step 4: Implement and test import-boundary enforcement**

In the shared ESLint config add `no-restricted-imports` patterns for `apps/api/**`, `../../apps/api/**`, and `@wiggle/*/src/**`. The fixture contains:

```ts
import "../../apps/api/app/main";
```

Add a config test that asserts ESLint reports `no-restricted-imports` for that fixture.

- [ ] **Step 5: Run quality checks**

Run:

```powershell
npm run lint
npm run typecheck
npm run test
npm run build --workspace=@wiggle/web
```

Expected: checks pass, while the dedicated lint-config test confirms the forbidden import is rejected.

- [ ] **Step 6: Commit**

```powershell
git add apps/web packages/config packages/ui packages/test-utils
git commit -m "feat: add typed web workspace boundaries"
```

### Task 5: Add CI Enforcement and Developer Documentation

**Files:**
- Create: `.github/workflows/verify.yml`, `tooling/scripts/verify-workflow.mjs`
- Modify: `README.md`, `.env.example`, root `package.json`, `package-lock.json`

**Interfaces:**
- Produces a pull-request and main-branch workflow rejecting lockfile drift, contract drift, quality regressions, and unlocked Python dependencies.
- Produces documented installation, verification, code-generation, API, and web startup commands.

- [ ] **Step 1: Write a failing workflow-content test**

`verify-workflow.mjs` parses `.github/workflows/verify.yml` as text and requires these command fragments:

```text
npm ci
uv sync --frozen
npm run codegen
git diff --exit-code -- packages/contracts/openapi.json packages/contracts/src/generated/api.d.ts
npm run lint
npm run typecheck
npm run test
npm run build
```

Expose it as root script `test:ci-config`.

- [ ] **Step 2: Run test to verify failure**

Run:

```powershell
npm run test:ci-config
```

Expected: FAIL because the workflow is absent.

- [ ] **Step 3: Implement workflow and developer instructions**

Use `actions/checkout@v4`, `actions/setup-node@v4` with Node 22/npm cache, and Astral uv setup pinned to a major version. Run all fragments asserted by the test, executing Python commands inside `apps/api` or with `--directory apps/api`.

Document this local sequence:

```powershell
npm ci
uv sync --directory apps/api
npm run codegen
npm run verify
uv run --directory apps/api uvicorn app.main:app --reload
npm run dev --workspace=@wiggle/web
```

State that `npm install` changes the lockfile, `npm ci` does not, and generated contract changes must be committed.

- [ ] **Step 4: Run full foundation verification**

Run:

```powershell
npm ci
uv sync --directory apps/api --frozen
npm run test:ci-config
npm run codegen
git diff --exit-code -- packages/contracts/openapi.json packages/contracts/src/generated/api.d.ts
npm run verify
```

Expected: every command exits zero.

- [ ] **Step 5: Commit**

```powershell
git add .github/workflows/verify.yml README.md .env.example package.json package-lock.json tooling/scripts/verify-workflow.mjs
git commit -m "ci: enforce monorepo quality gates"
```

### Task 6: Align the Existing Product Plan with the NPM Foundation

**Files:**
- Modify: `docs/superpowers/plans/2026-09-11-wiggle-hybrid-universe.md`

**Interfaces:**
- Produces a product plan whose Task 1 and commands are consistent with npm workspaces and this foundation plan.

- [ ] **Step 1: Identify every obsolete package-manager reference**

Run:

```powershell
rg -n "pnpm|pnpm-lock|pnpm-workspace" docs/superpowers/plans/2026-09-11-wiggle-hybrid-universe.md
```

Expected: matches occur in its architecture summary, Task 1, later tests, and final quality gate.

- [ ] **Step 2: Update direct npm equivalents**

Apply these replacements only where they refer to commands or filenames:

```text
pnpm monorepo                 -> npm-workspace monorepo
pnpm-workspace.yaml           -> package.json workspaces
pnpm-lock.yaml                -> package-lock.json
pnpm install                  -> npm install
pnpm lint                     -> npm run lint
pnpm typecheck                -> npm run typecheck
pnpm test --filter X          -> npm run test --workspace=X
pnpm build                    -> npm run build
```

Leave the product scope unchanged. Link Task 1 to this foundation plan and its `npm ci`, OpenAPI-codegen, and `uv sync --frozen` requirements.

- [ ] **Step 3: Validate and commit**

Run:

```powershell
rg -n "pnpm|pnpm-lock|pnpm-workspace" docs/superpowers/plans/2026-09-11-wiggle-hybrid-universe.md
git diff --check -- docs/superpowers/plans/2026-09-11-wiggle-hybrid-universe.md
```

Expected: no search output and a zero diff-check exit.

```powershell
git add docs/superpowers/plans/2026-09-11-wiggle-hybrid-universe.md
git commit -m "docs: align product plan with npm workspace"
```

## Plan Self-Review

- Spec coverage: Tasks 1 and 4 establish npm workspaces, explicit manifests, export maps, and Turbo; Task 2 establishes isolated locked Python and FastAPI ownership; Task 3 establishes OpenAPI-generated contracts; Task 5 establishes frozen CI and documentation; Task 6 removes contradictory pnpm references.
- Dependency discipline: explicit manifests, npm configuration, export maps, boundary linting, locked installs, drift checks, and commits enforce it.
- Failure cases: API health/OpenAPI are tested; code-generation drift fails CI; the lint fixture proves FastAPI implementation imports are forbidden; lockfile drift fails frozen installs.
- Type consistency: `create_app`, `HealthResponse`, `paths`, and `components` are defined in Tasks 2–3 before Task 4 consumes them.
- Placeholder scan: no incomplete work markers or unspecified implementation/error-handling steps remain.
