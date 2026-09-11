export class ParentApiError extends Error {
  constructor(readonly status: number) {
    super(status === 429 ? "Too many attempts. Try again in 5 minutes." : status === 401 ? "Please sign in to your household again." : status === 403 ? "Enter your parent PIN to continue." : "Could not save or load this right now. Please try again.");
  }
}
export async function parentRequest<T>(path: string, body?: unknown, key?: string): Promise<T> {
  const response = await fetch(`/api/parent/${path}`, {
    method: body === undefined ? "GET" : "POST", credentials: "same-origin", cache: "no-store",
    headers: { "Content-Type": "application/json", ...(key ? { "Idempotency-Key": key } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) throw new ParentApiError(response.status);
  return response.json() as Promise<T>;
}
