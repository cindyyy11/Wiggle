import type { LearningEvent } from "./events.js";
import type { LearnerTwin, TwinUpdate } from "./twin.js";

export interface AppendLearningEventsRequest {
  events: readonly LearningEvent[];
}

export interface AppendLearningEventsResponse {
  acceptedEventIds: readonly string[];
}

export interface TwinResponse {
  twin: LearnerTwin;
}

export type UpdateTwinResponse = TwinUpdate;
