# Two-minute Wiggle demo

## Before judges arrive

Install the dependencies and run the gates in [deployment.md](deployment.md). `pnpm dev` from the repository root starts Next on 3000 and the memory API on 8000. No environment file or provider key is required. This connected demo sends child events and parent insight to the same in-memory server. The web launcher reads an optional root `.env` and `apps/web/.env.local`; the API launcher reads an optional root `.env`.

Use a fresh browser profile and a fresh API process for predictable sample state. Open the universe, wait for its renderer, and check `http://127.0.0.1:8000/health`. Open `/parent` once, set a six-digit demo PIN you will remember, and lock it. Keep the parent tab ready. Default connected demo data and PIN hash reset when the API process restarts. This is an explicitly labelled shared sample household.

For a production-mode local demo, run `pnpm build`, then start `python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --workers 1 --no-access-log` from `apps/api`. Start Next from `apps/web` with `WIGGLE_API_URL=http://127.0.0.1:8000` in that terminal's environment using `pnpm exec next start`. In PowerShell, set that value with `$env:WIGGLE_API_URL='http://127.0.0.1:8000'` before the Next command. Use the existing production build; don't rebuild while presenting.

## Judge flow

| Time | Action and narration |
| --- | --- |
| 0:00–0:15 | Show Numeria in globe view. “One learning universe, with a complete fraction mission on this planet.” Briefly switch to Follow explorer and back. |
| 0:15–0:35 | Start fractions. Choose “2 of 4”, then “I'm stuck”. “A help request is useful evidence; the task becomes three concrete slices immediately.” |
| 0:35–0:55 | Open “See my learning paths”. “These predictions come from explicit weighted rules and the current learner state.” In a fresh browser-local fixture the authored values are 43%, 68%, 87%; connected values respond to recorded interactions and timing. Do not promise fixed live percentages. |
| 0:55–1:20 | Choose “Try Gesture + Visual”, deny/disable the camera if needed, and select slices 1, 2 and 3 with the large buttons. Check the pizza and show the completion/reward. “The objective stays the same while the way of doing it changes.” |
| 1:20–1:35 | Return to the universe. “This sample uses a 92% outcome to demonstrate the prediction comparison. Real household play records the answer to this question.” |
| 1:35–2:00 | Open the parent tab, enter the PIN and refresh if it was already open. Show completed missions, mastery history and “One thing to try together”. “This summary comes from the completed intervention. It describes learning activity, not a diagnosis.” |

Optional extension: Ask Lexi for a hint, try the Reset Station, or complete the short Reality Mission. They are not necessary to finish the two-minute path.

## Fallbacks and rollback

| Problem | Action |
| --- | --- |
| Camera denied, no camera, or model download unavailable | Continue using the slice buttons. Camera access is optional and local; inference assets load only after opt-in. |
| WebGL unavailable/lost or device struggles | The accessible 2D map appears automatically. Use the same destination and slice buttons. OS reduced motion removes long camera travel and decoration. |
| Gemini unavailable | The API uses authored content after its bounded timeout. Set `WIGGLE_AI_PROVIDER=local` and restart/redeploy that API when intentionally disabling Gemini. This keeps the same household persistence. |
| Temporary API interruption during a connected mission | Keep the tab open; ordinary evidence and completion stay queued with stable IDs. Restore the same API/database, then wait for retry or trigger the browser's online event by reconnecting. Do not erase local storage; it holds pending evidence. |
| Connected mission start cannot authenticate | Sign in again. Household mode does not create fake demo progress. Reuse the restored household service to retry. |
| Need a separate presentation without any API | Start a production Next server with `WIGGLE_API_URL` and both public Supabase values unset, using a build made without household Auth. The child loop is browser-local, and `/parent` is a labelled sample starting state with demo PIN `123456`. It does not show that local child's completion history. |
| Bad web release | Roll back to the previously verified Vercel deployment with its matching API contract/env values, then run the smoke gate. |
| Bad API release | Restore the previous Render image/commit with the same Supabase project and PIN disk. Keep one worker. Prefer a forward SQL repair reviewed against backups; do not reset the production database or run local seeds. |

Browser reload preserves queued evidence, but the current puzzle UI/selection does not resume after a reload. Restarting the memory API loses its demo sessions, so old pending sample events may be quarantined as unavailable; start a fresh sample for the presentation. Real household persistence requires Supabase and is a separate live verification gate.

## Known P3 polish and verification limits

The explorer uses original procedural geometry rather than Blender/glTF assets. Movement controls are a four-button directional pad. There is no ambient soundtrack toggle or modal mission journal; persistent destinations/progress and Lexi speech cover the current mission. No automatic break reminder scheduling exists yet; the parent stores a preference. Future worlds are locked. A physical mid-range mobile device, real camera hand accuracy, live household Auth/RLS, and external provider availability still require operator smoke testing. See [design-qa.md](../../design-qa.md) for the observed visual result.
