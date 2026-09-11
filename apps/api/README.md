# Wiggle API

Run `python -m uvicorn app.main:app --reload` from this directory. The default in-memory
demo seeds Nova (`10000000-0000-0000-0000-000000000011`) and the fraction mission
(`10000000-0000-0000-0000-000000000111`). Open `/docs` for the validated request/response
schemas. TypeScript counterparts are in `packages/contracts/src/api.ts`.

The hero workflow is:

1. `POST /session/start` with `{ "childId": "10000000-0000-0000-0000-000000000011" }`.
2. `POST /events` with `{ "events": [...] }`. Each event's stable UUID is its idempotency
   key; preserve IDs across retries and batch regrouping. Timestamps must end in `Z`.
3. `GET /twin/{child_id}` and `POST /twin/simulate` with `{ "sessionId": "..." }`.
4. `POST /adaptation/select` with `{ "sessionId": "...", "strategy": "visual_gesture" }`.
5. `POST /session/complete` with `{ "sessionId": "...", "correctness": 0.92 }`.
6. `GET /parent/insights?child_id=...` for a practical summary and the updated twin.

Send an `Idempotency-Key` header for start, adaptation selection, completion, and parent
check-in. Use a different key per logical operation and keep that key on retries. Reusing
a key with a different outcome returns 409. The events endpoint does not accept completion
events: the completion service derives the objective and mode from the saved mission and
intervention. Completion responses include the predicted/actual difference and audit changes.
The audit follows timestamp/ID replay order, starting at completion and including any later
events already recorded. Its final values match the returned twin. Once an outcome is saved,
retries return that same historical response; GET `/twin/{child_id}` returns current state.

`POST /lexi/chat` accepts `sessionId`, a bounded `message`, and an optional explicit `tool`.
Model suggestions never execute themselves. Mutating tools also require `Idempotency-Key`.
`report_learning_friction` records the event and selects chunk mode; `record_self_report`
requires `difficulty`. `POST /parent/check-in` takes `childId`, `difficulty`, and optional
`note`; these are contextual records and do not directly mutate the twin. Check-in difficulty
is rounded to three decimal places (half up) before persistence and retry comparison, matching
the database column precision in both repository backends.

Set `WIGGLE_AI_PROVIDER=gemini` and `GEMINI_API_KEY` to use Gemini. `GEMINI_MODEL` and
`GEMINI_TIMEOUT_SECONDS` are validated server-only settings. Without explicit provider
selection, a nonempty key chooses Gemini; no key chooses authored local content. Timeout,
transport errors, blocked/truncated responses, and invalid JSON/schema output use the local
provider. No camera frames or raw learner-state values are sent to the model.

For Supabase, set `WIGGLE_REPOSITORY_BACKEND=supabase`, `SUPABASE_URL`, and
`SUPABASE_ANON_KEY`, and send a household `Authorization: Bearer ...` access token. The API
verifies the token with Supabase Auth and uses that token for RLS-protected persistence.
Authentication failure never falls back to the public demo household. Parent routes also
require the integrated PIN gate; configure `WIGGLE_PIN_STORE_PATH` on a persistent private
single-host volume. See `docs/operations/deployment.md` from the repository root.

Workflow baselines and outcomes are persisted in intervention snapshots. Twin replay is
deterministic and can recover partial writes after restart. Run one API worker for this MVP:
the shared lock serializes workflows within one process; cross-worker database transactions
are not supplied by the current repository protocol. Memory data resets on process restart.

Verify with `python -m pytest -v`, `python -m ruff check app tests`, and `python -m mypy app`.
