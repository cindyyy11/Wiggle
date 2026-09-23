/** Pure gate for queueing the once-per-visit all-four cheer. */
export function shouldQueueCheer(previousCount: number, nextCount: number, cheerShown: boolean): boolean {
  return !cheerShown && previousCount < 4 && nextCount >= 4;
}
