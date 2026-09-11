import { randomBytes, scryptSync, timingSafeEqual, createHash } from "node:crypto";
import { demoParent } from "./demo/parent";
import { DEMO_CHILD_ID } from "./demo/seed";

// Only used when BOTH household Auth and the API upstream are absent. No real household data.
const salt = "wiggle-public-demo-only";
const hash = scryptSync("123456", salt, 32);
const state = { failures: 0, blocked: 0, tickets: new Map<string, number>(), interval: 20,
  checkIns: new Map<string, { body: string; id: string }>() };
const digest = (ticket: string) => createHash("sha256").update(ticket).digest("hex");
export async function demoParentRequest(endpoint: string, request: Request, ticket: string) {
  const now = Date.now();
  if (endpoint === "pin/status") return Response.json({ setupRequired: false });
  if (endpoint === "pin/verify") {
    if (state.blocked > now) return Response.json({}, { status: 429 });
    const { pin } = await request.json();
    if (typeof pin !== "string" || !/^[0-9]{6}$/.test(pin)) return Response.json({}, { status: 422 });
    if (!timingSafeEqual(scryptSync(pin, salt, 32), hash)) {
      if (++state.failures >= 5) { state.blocked = now + 300_000; state.failures = 0; }
      return Response.json({}, { status: state.blocked > now ? 429 : 403 });
    }
    state.failures = 0;
    for (const [key, expires] of state.tickets) if (expires <= now) state.tickets.delete(key);
    const value = randomBytes(32).toString("base64url");
    state.tickets.set(digest(value), now + 900_000);
    return Response.json({ ticket: value });
  }
  if (endpoint === "pin/lock") { state.tickets.delete(digest(ticket)); return Response.json({ locked: true }); }
  if ((state.tickets.get(digest(ticket)) || 0) <= now) return Response.json({}, { status: 403 });
  if (endpoint === "children") return Response.json([{ id: DEMO_CHILD_ID, name: "Nova" }]);
  if (endpoint === "insights") {
    if (new URL(request.url).searchParams.get("child_id") !== DEMO_CHILD_ID) return Response.json({}, { status: 404 });
    return Response.json(demoParent);
  }
  if (endpoint === "settings") {
    if (request.method === "POST") {
      const { breakIntervalMinutes } = await request.json();
      if (!Number.isInteger(breakIntervalMinutes) || breakIntervalMinutes < 5 || breakIntervalMinutes > 480) return Response.json({}, { status: 422 });
      state.interval = breakIntervalMinutes;
    }
    return Response.json({ breakIntervalMinutes: state.interval });
  }
  if (endpoint === "check-in") {
    const body = await request.json();
    if (body.childId !== DEMO_CHILD_ID) return Response.json({}, { status: 404 });
    if (typeof body.difficulty !== "number" || body.difficulty < 0 || body.difficulty > 1 || typeof body.note !== "string" || body.note.length > 1000) return Response.json({}, { status: 422 });
    const key = request.headers.get("Idempotency-Key");
    if (!key || key.length > 128) return Response.json({}, { status: 422 });
    const serialized = JSON.stringify(body);
    const existing = state.checkIns.get(key);
    if (existing && existing.body !== serialized) return Response.json({}, { status: 409 });
    const id = existing?.id || randomBytes(16).toString("hex");
    if (state.checkIns.size >= 100) state.checkIns.delete(state.checkIns.keys().next().value!);
    state.checkIns.set(key, { body: serialized, id });
    return Response.json({ checkInId: id, message: "Demo check-in saved for this server session." });
  }
  return Response.json({}, { status: 404 });
}
