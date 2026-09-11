import { NextRequest } from "next/server";
import { afterEach, expect, it, vi } from "vitest";
import { POST } from "../../app/api/backend/[...path]/route";
import { authConfig } from "../../lib/supabase/config";
import { householdSession } from "../../lib/supabase/server";

vi.mock("../../lib/supabase/config", () => ({ authConfig: vi.fn(() => null) }));
vi.mock("../../lib/supabase/server", () => ({ householdSession: vi.fn() }));
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.clearAllMocks(); vi.mocked(authConfig).mockReturnValue(null); });
const context = { params: Promise.resolve({ path: ["session", "start"] }) };
const request = (origin = "https://wiggle.example") => new NextRequest("https://wiggle.example/api/backend/session/start", {
  method: "POST", headers: { origin, host: "wiggle.example", Authorization: "Bearer unverified", "Idempotency-Key": "stable" }, body: JSON.stringify({ childId: "owned" }),
});

it("forwards only the verified household bearer and preserves retry identity", async () => {
  vi.stubEnv("WIGGLE_API_URL", "https://api.example");
  vi.mocked(authConfig).mockReturnValue({ url: "https://example.supabase.co", key: "sb_publishable_test" });
  vi.mocked(householdSession).mockResolvedValue({ userId: "household", accessToken: "verified" });
  const fetcher = vi.fn().mockResolvedValue(Response.json({ sessionId: "saved" }));
  vi.stubGlobal("fetch", fetcher);
  const response = await POST(request(), context);
  expect(response.status).toBe(200);
  const headers = fetcher.mock.calls[0][1].headers as Headers;
  expect(headers.get("Authorization")).toBe("Bearer verified");
  expect(headers.get("Idempotency-Key")).toBe("stable");
  expect(response.headers.get("Cache-Control")).toBe("private, no-store");
});

it("denies an expired household session without contacting the API", async () => {
  vi.stubEnv("WIGGLE_API_URL", "https://api.example");
  vi.mocked(authConfig).mockReturnValue({ url: "https://example.supabase.co", key: "sb_publishable_test" });
  vi.mocked(householdSession).mockResolvedValue(null);
  const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
  expect((await POST(request(), context)).status).toBe(401);
  expect(fetcher).not.toHaveBeenCalled();
});

it("rejects cross-origin writes before resolving household credentials", async () => {
  expect((await POST(request("https://other.example"), context)).status).toBe(403);
  expect(householdSession).not.toHaveBeenCalled();
});
