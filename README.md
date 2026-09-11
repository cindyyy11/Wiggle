# Wiggle

Wiggle is a learning universe that adapts fraction missions through observable,
deterministic learner-state updates. This repository is a pnpm monorepo with a
Next.js web app, a FastAPI service, and shared TypeScript contracts.

## Prerequisites

- Node.js 22 or newer
- pnpm 11 or newer
- Python 3.12 or newer

## Local development

Copy `.env.example` to `.env` and fill in provider values only when you want to
enable live services. The application remains usable with local fallbacks when
those credentials are blank. `NEXT_PUBLIC_API_URL` is safe for the web app;
`SUPABASE_SERVICE_ROLE_KEY` and `GEMINI_API_KEY` are server-only values and must
never be exposed to the browser.

```sh
pnpm install
pnpm dev
```

`pnpm dev` starts both the web app and the FastAPI service. Install the API
development dependencies before the first run:

```sh
cd apps/api
python -m pip install -e ".[dev]"
```

The API health endpoint is available at `http://localhost:8000/health`.

## Quality checks

```sh
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

The root lint, type-check, and test commands include the API's Ruff, mypy, and
pytest gates. To run one API gate on its own, use `pnpm api:test`,
`pnpm api:lint`, or `pnpm api:typecheck`.
