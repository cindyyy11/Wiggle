import type { GestureEvent } from "./gestureClassifier";
export interface MissionInputCommands {
  selectSlice(index: number): void;
  grabSlice(index: number): void;
  summonLexi(): void;
}
export const sliceAt = (x: number) => Math.min(3, Math.max(0, Math.floor(x * 4)));
export function dispatchGesture(event: GestureEvent, commands: MissionInputCommands) {
  if (event.gesture === "open_palm") commands.summonLexi();
  else if (event.gesture === "fist") commands.grabSlice(sliceAt(event.x));
  else commands.selectSlice(sliceAt(event.x));
}
