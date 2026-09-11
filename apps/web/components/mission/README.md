# Fraction mission integration

`MissionAtlas` composes the existing `UniverseCanvas` with the fraction state machine. The route moves from standard task to stuck support, three strategy predictions, an activity at the mission pedestal, and measured completion. Standard, Visual, Gesture, and Tiny steps all teach `identify-three-quarters`. Canvas meshes and accessible slice buttons share controlled slice selection. The map provides the same activity when WebGL is unavailable.

`MissionAtlas` accepts optional `quality` and `client` props for deterministic testing. `FractionMission` exposes its typed presentation callbacks for future Lexi integration; learning state stays in the atlas controller.

With no backend configured, a failed session start selects the local demo. All subsequent lesson actions use authored typed fixtures, including the demo's 92% measured result and 20 Energy reward. The result is awarded only after the child identifies three of four slices/pieces. Predictions (46%, 68%, 87%) are explicitly demo fixtures, not measurements or a live twin calculation. Configured API sessions use server simulation and selection responses.

The browser defaults to `/api/backend`. Set server-only `WIGGLE_API_URL` to the FastAPI base URL for a same-origin proxy. `NEXT_PUBLIC_API_URL` optionally overrides the browser URL directly; that server must support browser CORS. The proxy allows only the five mission POST routes, forwards Idempotency-Key and an incoming Authorization header, and never reads a service-role credential.

`EventQueue` stores a validated version-1 envelope in localStorage. Local demo entries stay local and are capped at 300; API entries remain until acknowledged. It retries on mount, online, and every 30 seconds. Storage denial preserves an in-memory queue. Completion envelopes go to `/session/complete` with the stable event ID as Idempotency-Key, never `/events`; ordinary events flush first. Interrupted/failed requests retain their keys and data. Leaving cancels current UI work and returns focus to mission entry.

The queue preserves event delivery through reload, not the active mission UI or Energy display. This slice does not add account/session authentication UI. Existing FastAPI authorization boundaries remain responsible for household access.
