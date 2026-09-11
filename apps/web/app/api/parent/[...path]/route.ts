import { NextRequest, NextResponse } from "next/server";
import { householdSession } from "../../../../lib/supabase/server";
import { authConfig } from "../../../../lib/supabase/config";
import { demoParentRequest } from "../../../../lib/parent-demo-server";
import { sameOriginMutation } from "../../../../lib/api/sameOrigin";

const reads = new Set(["pin/status", "children", "insights", "settings"]);
const writes = new Set(["pin/verify", "pin/setup", "pin/lock", "check-in", "settings"]);
const cookieName = "wiggle-parent-pin";
export async function GET(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return handle(request, (await context.params).path.join("/"));
}
export const POST = GET;

async function handle(request: NextRequest, endpoint: string) {
  if (!(request.method === "GET" ? reads : writes).has(endpoint)) return NextResponse.json({}, { status: 404 });
  if (request.method === "POST" && !sameOriginMutation(request.headers)) return NextResponse.json({}, { status: 403 });
  const upstream = process.env.WIGGLE_API_URL;
  try {
    const config = authConfig();
    const session = config ? await householdSession() : null;
    if (config && !session) return NextResponse.json({}, { status: 401 });
    if (config && !upstream) return NextResponse.json({}, { status: 503 });
    const ticket = request.cookies.get(cookieName)?.value || "";
    let response: Response;
    if (!upstream && !config) response = await demoParentRequest(endpoint, request, ticket);
    else {
      const headers = new Headers({ "Content-Type": "application/json", "X-Parent-Pin": ticket });
      if (session) headers.set("Authorization", `Bearer ${session.accessToken}`);
      const key = request.headers.get("Idempotency-Key");
      if (key) headers.set("Idempotency-Key", key);
      response = await fetch(`${upstream!.replace(/\/$/, "")}/parent/${endpoint}${request.nextUrl.search}`, {
        method: request.method, headers, cache: "no-store",
        body: request.method === "POST" ? await request.text() : undefined,
        signal: AbortSignal.any([request.signal, AbortSignal.timeout(8000)]),
      });
    }
    if (response.ok && ["pin/verify", "pin/setup"].includes(endpoint)) {
      const { ticket: issued } = await response.json();
      const result = NextResponse.json({ unlocked: true });
      result.cookies.set(cookieName, issued, { httpOnly: true, sameSite: "strict", secure: request.headers.get("origin")?.startsWith("https:") || false, path: "/api/parent", maxAge: 900 });
      result.headers.set("Cache-Control", "private, no-store");
      return result;
    }
    const result = new NextResponse(await response.text(), { status: response.status, headers: { "Content-Type": "application/json", "Cache-Control": "private, no-store" } });
    if (endpoint === "pin/lock") result.cookies.set(cookieName, "", { path: "/api/parent", maxAge: 0 });
    return result;
  } catch { return NextResponse.json({}, { status: 503, headers: { "Cache-Control": "private, no-store" } }); }
}
