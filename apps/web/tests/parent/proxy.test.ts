import { NextRequest } from "next/server";
import { afterEach, expect, it, vi } from "vitest";
import { GET } from "../../app/api/parent/[...path]/route";
import { demoParentRequest } from "../../lib/parent-demo-server";
import { authConfig } from "../../lib/supabase/config";
import { householdSession } from "../../lib/supabase/server";

vi.mock("../../lib/supabase/config", () => ({ authConfig: vi.fn(() => null) }));
vi.mock("../../lib/supabase/server", () => ({ householdSession: vi.fn() }));
vi.mock("../../lib/parent-demo-server", () => ({ demoParentRequest: vi.fn() }));
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.clearAllMocks(); vi.mocked(authConfig).mockReturnValue(null); });
const request = () => new NextRequest("https://wiggle.example/api/parent/pin/status");
const context = { params: Promise.resolve({ path: ["pin", "status"] }) };

it("preserves the connected API's actual memory-demo capability", async () => {
  vi.stubEnv("WIGGLE_API_URL", "http://127.0.0.1:8101");
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ setupRequired: true, dataMode: "memory_demo" })));
  const response = await GET(request(), context);
  expect(await response.json()).toEqual({ setupRequired: true, dataMode: "memory_demo" });
  expect(demoParentRequest).not.toHaveBeenCalled();
});

it("does not substitute a demo when a configured household service fails", async () => {
  vi.stubEnv("WIGGLE_API_URL", "https://api.example");
  vi.mocked(authConfig).mockReturnValue({ url: "https://example.supabase.co", key: "sb_publishable_test" });
  vi.mocked(householdSession).mockResolvedValue({ userId: "household", accessToken: "validated" });
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("unavailable")));
  const response = await GET(request(), context);
  expect(response.status).toBe(503);
  expect(demoParentRequest).not.toHaveBeenCalled();
});
