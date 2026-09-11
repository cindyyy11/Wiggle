# Parent mission control

Open `/parent`. With no API upstream and no Supabase Auth configuration, the page is
an explicitly labelled, server-memory demo. Its public demonstration PIN is `123456`.
It shows Nova's starting state, not invented progress or the browser's local events.
Demo preferences/check-ins reset when the server restarts; they never become learner evidence.

With `WIGGLE_API_URL`, the page uses the existing parent API and repositories. For a
Supabase household, set `NEXT_PUBLIC_SUPABASE_URL` and
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` on the Next.js host. Only `sb_publishable_…`
keys are accepted; secret/service-role keys must never be provided. Incomplete
configuration fails closed. Sign in with an existing household account at
`/parent/sign-in`; its child profiles must already exist. Registration and PIN
recovery are outside this task. Auth is freshly validated with `getUser()` in the
middleware, server page and parent proxy; the API independently resolves the bearer
identity. Metadata is never an authorization source.

The authenticated parent sets a six-digit PIN on first entry. Salted scrypt hashes
and break preferences use the existing `parent_settings` repository. Five wrong
attempts block verification for five minutes. Tickets are random, hashed in the
server store, expire after 15 minutes and are bound to the authenticated owner.
The browser receives only an HttpOnly, SameSite=Strict cookie; parent mutations
require the same origin. Lock revokes the ticket and clears the rendered dashboard.
The gate also closes automatically after 15 minutes.

Set `WIGGLE_PIN_STORE_PATH` in the API deployment to a private SQLite file on a
**persistent disk attached to one API host**, for example `/var/data/wiggle/pin.sqlite`
on Render (create the parent directory first). Its transaction serializes PIN
verification/setup across workers on that host and survives restarts. Missing
configuration disables parent access in Supabase mode. Do not put this file on an
ephemeral container filesystem, an NFS volume or separate disks behind multiple
hosts. Multi-host deployment requires replacing `PinStore` with a shared transactional
rate-limit/ticket store before enabling parent access there. No remote project,
database migration or deployment is performed by this task.

The PIN is a shared-device convenience barrier; household authentication and RLS
remain the data authorization boundary. An authenticated account can read/write its
own parent settings under the existing schema, so the PIN does not protect against
someone who controls that account or its tokens. No PIN hash is sent by these UI APIs.

Mastery history replays stored evidence through the same domain update function as
the authoritative twin. Independence is explicitly described as the presence or
absence of hint/stuck requests, not an assessment of adult help. Empty history stays
empty. Check-ins remain context-only and never directly modify the twin. The break
interval is a saved preference; automatic reminder scheduling is not implemented.

Local verification: web parent component/auth tests, Python PIN/authorization tests,
and `node node_modules/@playwright/test/cli.js test tests/browser/parent.spec.ts`
from `apps/web` against a running production server at port 3100.
