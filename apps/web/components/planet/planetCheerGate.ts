/** Queue when crossing four and cheer has not shown this session. */
export function shouldQueueCheer(previousCount: number, nextCount: number, cheerShown: boolean): boolean {
  return !cheerShown && previousCount < 4 && nextCount >= 4;
}

/** Queue when hydrating an already-complete planet that has not cheered this session. */
export function shouldQueueCheerOnHydrate(count: number, cheerShown: boolean): boolean {
  return !cheerShown && count >= 4;
}
