import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { authConfig } from "./config";

export async function createClient() {
  const config = authConfig();
  if (!config) return null;
  const jar = await cookies();
  return createServerClient(config.url, config.key, {
    cookies: {
      getAll: () => jar.getAll(),
      setAll(values) {
        try { values.forEach(({ name, value, options }) => jar.set(name, value, options)); }
        catch { /* Server Components are read-only; middleware refreshes cookies. */ }
      },
    },
  });
}

export async function householdSession() {
  const client = await createClient();
  if (!client) return null;
  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user) return null;
  // Only retrieve the bearer after Auth has validated the identity. No metadata authorization.
  const { data: { session } } = await client.auth.getSession();
  return session ? { userId: user.id, accessToken: session.access_token } : null;
}
