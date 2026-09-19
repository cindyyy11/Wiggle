import { describe, expect, it } from "vitest";
import { SPACE_PLAYGROUND_COUNTS } from "./SpacePlaygroundDressings";

describe("space playground decoration budget", () => {
  it("keeps low quality materially lighter than high quality", () => {
    expect(SPACE_PLAYGROUND_COUNTS.low.nearStars).toBeLessThan(SPACE_PLAYGROUND_COUNTS.high.nearStars);
    expect(SPACE_PLAYGROUND_COUNTS.low.farStars).toBeLessThan(SPACE_PLAYGROUND_COUNTS.high.farStars);
  });

  it("keeps the star field sparse enough for a clear focal planet", () => {
    expect(SPACE_PLAYGROUND_COUNTS.high.nearStars + SPACE_PLAYGROUND_COUNTS.high.farStars).toBeLessThanOrEqual(200);
  });
});
