import { afterEach, expect, it, vi } from "vitest";

const { getUser, getSession, createServerClient } = vi.hoisted(() => {
  const getUser = vi.fn();
  const getSession = vi.fn();
  return { getUser, getSession, createServerClient: vi.fn(() => ({ auth: { getUser, getSession } })) };
});
vi.mock("@supabase/ssr", () => ({ createServerClient }));
vi.mock("next/headers", () => ({ cookies: async () => ({ getAll: () => [], set: vi.fn() }) }));
import { authConfig } from "../../lib/supabase/config";
import { householdSession } from "../../lib/supabase/server";

afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks(); });
it("fails closed for incomplete configuration and non-publishable browser keys", () => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_secret_private");
  expect(authConfig).toThrow("publishable");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "");
  expect(authConfig).toThrow();
});
it("denies a forged cookie without consulting unvalidated session metadata", async () => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test");
  getUser.mockResolvedValue({ data: { user: null }, error: new Error("invalid") });
  expect(await householdSession()).toBeNull();
  expect(getSession).not.toHaveBeenCalled();
});
it("forwards only the token after fresh server identity validation", async () => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test");
  getUser.mockResolvedValue({ data: { user: { id: "real-owner", user_metadata: { ownerId: "other" } } }, error: null });
  getSession.mockResolvedValue({ data: { session: { access_token: "validated-token" } } });
  expect(await householdSession()).toEqual({ userId: "real-owner", accessToken: "validated-token" });
});
