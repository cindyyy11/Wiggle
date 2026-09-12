import type { GestureEvent } from "./gestureClassifier";
import type { CompletionInput } from "@wiggle/contracts";
export interface MissionInputCommands {
  focusSlice?(index: number, input?: CompletionInput): void;
  placeSlice?(index: number, input?: CompletionInput): void;
  returnSlice?(index: number, input?: CompletionInput): void;
  openLexi?(input?: CompletionInput): void;
  /** Accessible aliases retained for existing button and fallback controls. */
  selectSlice(index: number, input?: CompletionInput): void;
  grabSlice(index: number, input?: CompletionInput): void;
  summonLexi(): void;
}
export const sliceAt = (x: number) => Math.min(3, Math.max(0, Math.floor(x * 4)));
export function dispatchGesture(event: GestureEvent, commands: MissionInputCommands) {
  // Legacy 2D-camera adapter: the R3F bridge uses the semantic commands directly.
  if (event.gesture === "open_palm") commands.summonLexi();
  else if (event.gesture === "fist") commands.grabSlice(sliceAt(event.x), "gesture");
  else commands.selectSlice(sliceAt(event.x), "gesture");
}
