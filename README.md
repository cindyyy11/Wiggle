<p align="center">
  <img src="apps/web/public/brand/wiggle-full.jpeg" alt="Wiggle. Wonder. Wow!" width="420" />
</p>

# Wiggle

A playful learning universe where kids explore subject worlds, complete adaptive missions, and build a Digital Twin from real evidence — not guesswork.

This monorepo ships:

| Package | Role |
| --- | --- |
| `apps/web` | Next.js child universe + parent space |
| `apps/api` | FastAPI mission, twin, and parent services |
| `packages/contracts` | Shared TypeScript API contracts |

## Prerequisites

- Node.js 24.x (24.19+ on Vercel; 24.21+ recommended locally)
- npm 11.6 or newer
- Python 3.12 or newer

## Local development

No credentials are required for the connected demo. `npm run dev` wires the child mission and parent space to the same local memory API.

```sh
npm ci
python -m pip install -e "apps/api[dev]"
npm run dev
```

- Web: [http://localhost:3000](http://localhost:3000)
- API health: [http://localhost:8000/health](http://localhost:8000/health)
- Parent space: [http://localhost:3000/parent](http://localhost:3000/parent) — set a demo PIN to review completed mission history

Optional env files: copy `.env.example` to `.env` at the repo root; the web app also reads `apps/web/.env.local`. Never expose service-role or Gemini keys to the browser. Demo data resets when the API restarts.

## Quality checks

```sh
npm run lint
npm run typecheck
npm run test
npm run build
npm run test:e2e
```

Root lint, type-check, and test include the API’s Ruff, mypy, and pytest gates. Run one API gate alone with `npm run api:test`, `npm run api:lint`, or `npm run api:typecheck`.

The browser suite starts fresh production servers on 3100/3101 and a test-only API on 8101. It covers desktop and 390×844 mobile, the connected loop, keyboard/pointer controls, camera/WebGL fallbacks, Gemini timeout, replay, and parent insights. Chrome is required. Live Supabase tests need separate setup; their skips are not a live RLS pass.

## Deploy

Production shape is **Vercel** (web), **Render** (API), and **Supabase** (auth/database). See:

- [Deployment and smoke checks](docs/operations/deployment.md)
- [Two-minute demo runbook](docs/operations/demo-runbook.md)
- [Visual QA and blockers](design-qa.md)
