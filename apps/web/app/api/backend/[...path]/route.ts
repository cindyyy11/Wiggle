import { NextRequest, NextResponse } from "next/server";

const allowed = new Set(["session/start", "session/complete", "twin/simulate", "adaptation/select", "events", "lexi/chat"]);

/** Same-origin transport avoids browser CORS; the upstream URL is server-only. */
export async function POST(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  const endpoint = path.join("/");
  if (!allowed.has(endpoint)) return NextResponse.json({ error: "Unknown mission request" }, { status: 404 });
  const upstream = process.env.WIGGLE_API_URL;
  if (!upstream) return NextResponse.json({ error: "Local mission ready" }, { status: 503 });
  try {
    const headers = new Headers({ "Content-Type": "application/json" });
    for (const name of ["Idempotency-Key", "Authorization"]) {
      const value = request.headers.get(name);
      if (value) headers.set(name, value);
    }
    const response = await fetch(`${upstream.replace(/\/$/, "")}/${endpoint}`, {
      method: "POST", headers, body: await request.text(), cache: "no-store",
      signal: AbortSignal.any([request.signal, AbortSignal.timeout(4500)]),
    });
    return new NextResponse(await response.text(), { status: response.status, headers: { "Content-Type": "application/json" } });
  } catch { return NextResponse.json({ error: "Mission connection resting" }, { status: 503 }); }
}
