# Wiggle

Wiggle is a learning universe that adapts fraction missions through observable,
deterministic learner-state updates. This repository is a pnpm monorepo with a
Next.js web app, a FastAPI service, and shared TypeScript contracts.

## Prerequisites

- Node.js 22 or newer
- pnpm 11 or newer
- Python 3.12 or newer

## Local development

No credentials are required. `pnpm dev` connects the child mission and parent
space to the same local memory API. An optional root `.env` can be copied from
`.env.example` for provider configuration; the web app also reads
`apps/web/.env.local`. Never expose service-role or Gemini keys to the browser.

```sh
pnpm install --frozen-lockfile
python -m pip install -e "apps/api[dev]"
pnpm dev
```

`pnpm dev` starts the web app at `http://localhost:3000` and the API on port 8000.
Open `/parent` to set a demo PIN and see completed mission history. The connected
demo is shared sample data and resets when the API restarts.

The API health endpoint is available at `http://localhost:8000/health`.

## Quality checks

```sh
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm test:e2e
```

The root lint, type-check, and test commands include the API's Ruff, mypy, and
pytest gates. To run one API gate on its own, use `pnpm api:test`,
`pnpm api:lint`, or `pnpm api:typecheck`.

The browser suite starts fresh production servers on 3100/3101 and a test-only
API on 8101. It covers desktop and 390 × 844 mobile, the complete connected loop,
keyboard/pointer controls, camera/WebGL fallbacks, Gemini timeout, replay and
parent insights. Chrome is required. Live Supabase tests need separate setup;
their skips are not a live RLS pass.

See [deployment and smoke checks](docs/operations/deployment.md), the
[two-minute demo runbook](docs/operations/demo-runbook.md), and
[visual QA and blockers](design-qa.md). Vercel/Render/Supabase configuration is
prepared; no live deployment is claimed.
