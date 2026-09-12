import { NextRequest, NextResponse } from "next/server";
import { authConfig } from "../../../../lib/supabase/config";
import { householdSession } from "../../../../lib/supabase/server";
import { sameOriginMutation } from "../../../../lib/api/sameOrigin";

const allowed = new Set(["session/start", "session/complete", "twin/simulate", "adaptation/select", "events", "lexi/chat"]);
/** Read-only GETs: an exact-id segment, never a wildcard, keeps this to the child's own data. */
const readablePatterns = [/^twin\/[^/]+$/, /^child\/[^/]+\/progress$/];
const isReadable = (endpoint: string) => readablePatterns.some(pattern => pattern.test(endpoint));

/** Same-origin transport avoids browser CORS; the upstream URL is server-only. */
export async function POST(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  const endpoint = path.join("/");
  if (!allowed.has(endpoint)) return NextResponse.json({ error: "Unknown mission request" }, { status: 404 });
  if (!sameOriginMutation(request.headers)) return NextResponse.json({}, { status: 403 });
  const upstream = process.env.WIGGLE_API_URL;
  if (!upstream) return NextResponse.json({ error: "Local mission ready" }, { status: 503 });
  try {
    const config = authConfig();
    const session = config ? await householdSession() : null;
    if (config && !session) return NextResponse.json({}, { status: 401 });
    const headers = new Headers({ "Content-Type": "application/json" });
    for (const name of ["Idempotency-Key"]) {
      const value = request.headers.get(name);
      if (value) headers.set(name, value);
    }
    if (session) headers.set("Authorization", `Bearer ${session.accessToken}`);
    const response = await fetch(`${upstream.replace(/\/$/, "")}/${endpoint}`, {
      method: "POST", headers, body: await request.text(), cache: "no-store",
      signal: AbortSignal.any([request.signal, AbortSignal.timeout(12_000)]),
    });
    return new NextResponse(await response.text(), { status: response.status, headers: { "Content-Type": "application/json", "Cache-Control": "private, no-store" } });
  } catch { return NextResponse.json({ error: "Mission connection resting" }, { status: 503 }); }
}

/** The child's own Twin and progress: read-only, no Idempotency-Key, no mutation surface. */
export async function GET(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  const endpoint = path.join("/");
  if (!isReadable(endpoint)) return NextResponse.json({ error: "Unknown mission request" }, { status: 404 });
  const upstream = process.env.WIGGLE_API_URL;
  if (!upstream) return NextResponse.json({ error: "Local mission ready" }, { status: 503 });
  try {
    const config = authConfig();
    const session = config ? await householdSession() : null;
    if (config && !session) return NextResponse.json({}, { status: 401 });
    const headers = new Headers();
    if (session) headers.set("Authorization", `Bearer ${session.accessToken}`);
    const response = await fetch(`${upstream.replace(/\/$/, "")}/${endpoint}`, {
      method: "GET", headers, cache: "no-store",
      signal: AbortSignal.any([request.signal, AbortSignal.timeout(12_000)]),
    });
    return new NextResponse(await response.text(), { status: response.status, headers: { "Content-Type": "application/json", "Cache-Control": "private, no-store" } });
  } catch { return NextResponse.json({ error: "Mission connection resting" }, { status: 503 }); }
}
