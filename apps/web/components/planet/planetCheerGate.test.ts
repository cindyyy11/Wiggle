import { expect, it } from "vitest";
import { shouldQueueCheer, shouldQueueCheerOnHydrate } from "./planetCheerGate";

it("queues only when crossing four and cheer has not shown", () => {
  expect(shouldQueueCheer(3, 4, false)).toBe(true);
  expect(shouldQueueCheer(0, 4, false)).toBe(true);
  expect(shouldQueueCheer(3, 4, true)).toBe(false);
  expect(shouldQueueCheer(2, 3, false)).toBe(false);
  expect(shouldQueueCheer(4, 4, false)).toBe(false);
});

it("queues on hydrate when already complete and not cheered", () => {
  expect(shouldQueueCheerOnHydrate(4, false)).toBe(true);
  expect(shouldQueueCheerOnHydrate(4, true)).toBe(false);
  expect(shouldQueueCheerOnHydrate(3, false)).toBe(false);
});
