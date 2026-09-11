/** Next may normalize nextUrl to localhost behind a proxy; Host retains the request authority. */
export function sameOriginMutation(headers: Headers) {
  const origin = headers.get("origin");
  const host = headers.get("host");
  if (!origin || !host) return false;
  try {
    const parsed = new URL(origin);
    return ["http:", "https:"].includes(parsed.protocol) && parsed.origin === origin && parsed.host === host;
  } catch { return false; }
}
