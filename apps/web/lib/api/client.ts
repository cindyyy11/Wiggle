import type { AppendLearningEventsRequest, AppendLearningEventsResponse, CompleteSessionRequest, CompleteSessionResponse, SelectAdaptationRequest, SelectAdaptationResponse, SimulateRequest, SimulationReport, StartSessionRequest, StartSessionResponse } from "@wiggle/contracts";

export class ApiClient {
  constructor(readonly baseUrl = process.env.NEXT_PUBLIC_API_URL || "/api/backend") {}

  private async post<T>(path: string, body: unknown, signal: AbortSignal, key?: string): Promise<T> {
    const controller = new AbortController();
    const abort = () => controller.abort();
    if (signal.aborted) controller.abort();
    signal.addEventListener("abort", abort, { once: true });
    const timeout = setTimeout(abort, 5000);
    try {
      const response = await fetch(`${this.baseUrl.replace(/\/$/, "")}${path}`, {
        method: "POST", signal: controller.signal, credentials: "same-origin",
        headers: { "Content-Type": "application/json", ...(key ? { "Idempotency-Key": key } : {}) },
        body: JSON.stringify(body),
      });
      if (!response.ok) throw new Error(`Mission request failed (${response.status})`);
      return await response.json() as T;
    } finally { clearTimeout(timeout); signal.removeEventListener("abort", abort); }
  }
  start(body: StartSessionRequest, key: string, signal: AbortSignal) { return this.post<StartSessionResponse>("/session/start", body, signal, key); }
  simulate(body: SimulateRequest, signal: AbortSignal) { return this.post<SimulationReport>("/twin/simulate", body, signal); }
  select(body: SelectAdaptationRequest, key: string, signal: AbortSignal) { return this.post<SelectAdaptationResponse>("/adaptation/select", body, signal, key); }
  complete(body: CompleteSessionRequest, key: string, signal: AbortSignal) { return this.post<CompleteSessionResponse>("/session/complete", body, signal, key); }
  events(body: AppendLearningEventsRequest, signal: AbortSignal) { return this.post<AppendLearningEventsResponse>("/events", body, signal); }
}
