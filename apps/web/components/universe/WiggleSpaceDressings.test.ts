import { describe, expect, it } from "vitest";
import { decorationCounts } from "./WiggleSpaceDressings";

describe("Wiggle space dressing quality", () => {
  it("keeps a lighter decorative budget on low quality", () => {
    const high = decorationCounts("high");
    const low = decorationCounts("low");
    expect(low.clouds).toBeLessThan(high.clouds);
    expect(low.rocks).toBeLessThan(high.rocks);
    expect(low.beacons).toBeGreaterThan(0);
  });
});
