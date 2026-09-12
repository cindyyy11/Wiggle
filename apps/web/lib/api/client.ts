import type { AppendLearningEventsRequest, AppendLearningEventsResponse, CompleteSessionRequest, CompleteSessionResponse, LexiRequest, LexiResponse, ParentInsightsResponse, SelectAdaptationRequest, SelectAdaptationResponse, SimulateRequest, SimulationReport, StartSessionRequest, StartSessionResponse, TwinResponse } from "@wiggle/contracts";

export class ApiError extends Error {
  constructor(readonly status: number) { super(`Mission request failed (${status})`); }
  get permanent() { return this.status >= 400 && this.status < 500 && ![401, 403, 408, 425, 429].includes(this.status); }
}

export class ApiClient {
  constructor(readonly baseUrl = process.env.NEXT_PUBLIC_API_URL || "/api/backend") {}

  private async get<T>(path: string, signal: AbortSignal): Promise<T> {
    const response = await fetch(`${this.baseUrl.replace(/\/$/, "")}${path}`, {
      method: "GET", signal, credentials: "same-origin", cache: "no-store",
    });
    if (!response.ok) throw new ApiError(response.status);
    return await response.json() as T;
  }
  private async post<T>(path: string, body: unknown, signal: AbortSignal, key?: string): Promise<T> {
    const controller = new AbortController();
    const abort = () => controller.abort();
    if (signal.aborted) controller.abort();
    signal.addEventListener("abort", abort, { once: true });
    const timeout = setTimeout(abort, 15_000);
    try {
      const response = await fetch(`${this.baseUrl.replace(/\/$/, "")}${path}`, {
        method: "POST", signal: controller.signal, credentials: "same-origin",
        headers: { "Content-Type": "application/json", ...(key ? { "Idempotency-Key": key } : {}) },
        body: JSON.stringify(body),
      });
      if (!response.ok) throw new ApiError(response.status);
      return await response.json() as T;
    } finally { clearTimeout(timeout); signal.removeEventListener("abort", abort); }
  }
  start(body: StartSessionRequest, key: string, signal: AbortSignal) { return this.post<StartSessionResponse>("/session/start", body, signal, key); }
  simulate(body: SimulateRequest, signal: AbortSignal) { return this.post<SimulationReport>("/twin/simulate", body, signal); }
  select(body: SelectAdaptationRequest, key: string, signal: AbortSignal) { return this.post<SelectAdaptationResponse>("/adaptation/select", body, signal, key); }
  complete(body: CompleteSessionRequest, key: string, signal: AbortSignal) { return this.post<CompleteSessionResponse>("/session/complete", body, signal, key); }
  events(body: AppendLearningEventsRequest, signal: AbortSignal) { return this.post<AppendLearningEventsResponse>("/events", body, signal); }
  lexi(body: LexiRequest, key: string, signal: AbortSignal) { return this.post<LexiResponse>("/lexi/chat", body, signal, key); }
  twin(childId: string, signal: AbortSignal) { return this.get<TwinResponse>(`/twin/${encodeURIComponent(childId)}`, signal); }
  childProgress(childId: string, signal: AbortSignal) { return this.get<ParentInsightsResponse>(`/child/${encodeURIComponent(childId)}/progress`, signal); }
}
