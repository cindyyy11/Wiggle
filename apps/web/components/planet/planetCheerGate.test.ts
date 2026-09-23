import { expect, it } from "vitest";
import { shouldQueueCheer } from "./planetCheerGate";

it("queues only when crossing four and cheer has not shown", () => {
  expect(shouldQueueCheer(3, 4, false)).toBe(true);
  expect(shouldQueueCheer(0, 4, false)).toBe(true);
  expect(shouldQueueCheer(3, 4, true)).toBe(false);
  expect(shouldQueueCheer(2, 3, false)).toBe(false);
  expect(shouldQueueCheer(4, 4, false)).toBe(false);
});
