import type { CompletionInput, LearningEvent, LearningMode } from "./events.js";
import type { StrategyName } from "./simulation.js";
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

/** Start, selection, completion, check-in and mutating Lexi calls require Idempotency-Key. */
export interface TextContent { text: string }
export interface ActivityContent extends TextContent {
  objective: "identify-three-quarters";
  targetSlices: 3;
  totalSlices: 4;
}
export interface StartSessionRequest { childId: string; missionId?: string | null }
export interface StartSessionResponse {
  sessionId: string;
  childId: string;
  missionId: string;
  objective: string;
  activity: ActivityContent;
}
export interface SimulateRequest { sessionId: string }
export interface SelectAdaptationRequest extends SimulateRequest { strategy: StrategyName }
export interface SelectAdaptationResponse {
  interventionId: string;
  strategy: StrategyName;
  mode: LearningMode;
  predictedSuccess: number;
  activity: ActivityContent;
}
export interface CompleteSessionRequest extends SimulateRequest { correctness: number; inputMethod?: CompletionInput }
export interface CompleteSessionResponse {
  sessionId: string;
  interventionId: string;
  update: TwinUpdate;
  predictedSuccess: number;
  actualSuccess: number;
  predictionError: number;
  celebration: TextContent;
}
export type LexiTool = "get_current_twin" | "get_current_mission" | "report_learning_friction"
  | "request_hint" | "switch_learning_mode" | "start_reset_station" | "create_reality_mission"
  | "record_self_report";
export interface LexiContent extends TextContent { suggestedTool: LexiTool | null }
export interface LexiRequest extends SimulateRequest {
  message?: string;
  tool?: LexiTool | null;
  mode?: LearningMode | null;
  difficulty?: number | null;
}
export interface LexiResponse {
  content: LexiContent;
  executedTool: LexiTool | null;
  mode: LearningMode | null;
  activity: ActivityContent | null;
  resetStarted: boolean;
  realityMission: string | null;
  learningLabel: string | null;
}
export interface CheckInRequest { childId: string; difficulty: number; note?: string }
export interface CheckInResponse { checkInId: string; message: string }
/** Counts for the current day only, derived from learning_events — never a diagnostic score. */
export interface TodaySummary {
  missionsCompleted: number;
  independentMissions: number;
  helpRequests: number;
  resetBreaks: number;
  learningMinutes: number;
  offlineMinutes: number;
}

/** A week-over-week comparison, phrased for a parent. Absent until 7+ days of history exist. */
export interface WeeklySummary {
  childName: string;
  masteryDeltaBySubject: Readonly<Record<string, number>>;
  independentCompletionDelta: number;
  mostEffectiveStrategy: string | null;
  biggestImprovement: string | null;
  wiggleNoticed: string;
  parentSuggestion: string;
}

export interface ParentInsightsResponse {
  childId: string;
  completedMissions: number;
  twin: LearnerTwin;
  insight: TextContent;
  missions?: readonly { title: string; objective: string }[];
  masteryHistory?: readonly { label: string; value: number }[];
  independenceHistory?: readonly { label: string; value: number }[];
  today?: TodaySummary;
  weeklySummary?: WeeklySummary | null;
}
