import { expect, it } from "vitest";
import { isCorrectMathAnswer, mathActivity, MATH_ACTIVITIES } from "./mathActivities";

it("defines one three-challenge activity for each Numeria learning region", () => {
  expect(Object.keys(MATH_ACTIVITIES)).toEqual([
    "fraction-forest",
    "number-valley",
    "geometry-ridge",
    "crystal-crater",
  ]);

  for (const activity of Object.values(MATH_ACTIVITIES)) {
    expect(activity.challenges).toHaveLength(3);
    for (const challenge of activity.challenges) {
      expect(challenge.options.filter((option) => option === challenge.answer)).toHaveLength(1);
      expect(isCorrectMathAnswer(challenge, challenge.answer)).toBe(true);
    }
  }
});

it("returns activities and scoring only for known regions and answers", () => {
  const challenge = MATH_ACTIVITIES["fraction-forest"].challenges[0];

  expect(mathActivity("fraction-forest")).toBe(MATH_ACTIVITIES["fraction-forest"]);
  expect(mathActivity("lexi")).toBeUndefined();
  expect(mathActivity("unknown-region")).toBeUndefined();
  expect(isCorrectMathAnswer(challenge, "not an answer")).toBe(false);
});
