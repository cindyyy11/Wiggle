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

In another terminal, install the API development dependencies and run FastAPI:

```sh
cd apps/api
python -m pip install -e ".[dev]"
uvicorn app.main:app --reload
```

The API health endpoint is available at `http://localhost:8000/health`.

## Quality checks

```sh
pnpm lint
pnpm typecheck
pnpm test
pnpm build
cd apps/api && python -m pytest -v && ruff check . && mypy app
```
