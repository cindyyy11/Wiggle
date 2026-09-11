export function authConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url && !key) return null;
  if (!url || !key?.startsWith("sb_publishable_")) throw new Error("A Supabase URL and publishable key are required.");
  return { url, key };
}
