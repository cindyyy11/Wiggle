import { describe, expect, it } from "vitest";
import { MATH_ACTIVITIES } from "../../math/mathActivities";
import { ANSWER_SETS, answerSetFor } from "./index";

const sets = Object.entries(ANSWER_SETS).filter(([, set]) => set);

describe("the answer sets", () => {
  it("offers Number Valley", () => {
    expect(ANSWER_SETS["number-valley"]).toBeTruthy();
  });

  it("looks a set up by region id, and only for hand-played regions", () => {
    expect(answerSetFor("number-valley")).toBe(ANSWER_SETS["number-valley"]);
    expect(answerSetFor("fraction-forest")).toBeUndefined();
    expect(answerSetFor("toString")).toBeUndefined();
  });
});

describe.each(sets)("%s answer set", (region, set) => {
  const activity = MATH_ACTIVITIES[region as keyof typeof MATH_ACTIVITIES];

  it("is keyed by a real region and labelled", () => {
    expect(activity).toBeTruthy();
    expect(set!.region).toBe(region);
    expect(set!.label).toBe(`${activity.name} workbench`);
  });

  it("can draw every challenge the lesson has", () => {
    for (const challenge of activity.challenges) expect(challenge.visual.kind, challenge.id).toBe(set!.visual);
  });

  it("has one token spot for each option of every challenge", () => {
    for (const challenge of activity.challenges) expect(set!.tokens, challenge.id).toHaveLength(challenge.options.length);
  });

  it("keeps every token hit area on the bench and clear of every other", () => {
    for (const at of set!.tokens) {
      expect(at.x - set!.tokenRadius).toBeGreaterThanOrEqual(0);
      expect(at.x + set!.tokenRadius).toBeLessThanOrEqual(1);
      expect(at.y - set!.tokenRadius).toBeGreaterThanOrEqual(0);
      expect(at.y + set!.tokenRadius).toBeLessThanOrEqual(1);
    }
    for (let a = 0; a < set!.tokens.length; a++) {
      for (let b = a + 1; b < set!.tokens.length; b++) {
        const gap = Math.hypot(set!.tokens[a].x - set!.tokens[b].x, set!.tokens[a].y - set!.tokens[b].y);
        expect(gap, `token ${a} overlaps token ${b}`).toBeGreaterThanOrEqual(set!.tokenRadius * 2);
      }
    }
  });

  it("keeps the answer row below where the puzzle is drawn", () => {
    for (const at of set!.tokens) expect(at.y + set!.tokenRadius).toBeLessThan(.4);
  });
});
