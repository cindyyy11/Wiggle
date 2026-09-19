import { LANDMARKS, type LandmarkId } from "../universe/world";

export type MathRegionId = Exclude<LandmarkId, "lexi">;

export type MathVisual =
  | { kind: "fraction"; filled: number; total: number }
  | { kind: "sequence"; values: readonly (number | null)[] }
  | { kind: "shape"; shape: "triangle" | "square" | "hexagon" }
  | { kind: "crystals"; left: number; operator: "+" | "-"; right: number };

export type MathChallenge = {
  id: string;
  prompt: string;
  hint: string;
  visual: MathVisual;
  options: readonly string[];
  answer: string;
};

export type MathActivity = {
  id: MathRegionId;
  name: string;
  subtitle: string;
  instruction: string;
  color: string;
  challenges: readonly MathChallenge[];
};

function landmarkFor(id: MathRegionId) {
  const landmark = LANDMARKS.find((entry) => entry.id === id);
  if (!landmark) throw new Error(`Missing Numeria landmark: ${id}`);
  return landmark;
}

function activity(
  id: MathRegionId,
  instruction: string,
  challenges: readonly MathChallenge[],
): MathActivity {
  const landmark = landmarkFor(id);
  return {
    id,
    name: landmark.name,
    subtitle: landmark.subtitle,
    color: landmark.color,
    instruction,
    challenges,
  };
}

export const MATH_ACTIVITIES: Record<MathRegionId, MathActivity> = {
  "fraction-forest": activity("fraction-forest", "Look at each leafy fraction, then choose the fraction it shows.", [
    {
      id: "half-leaves",
      prompt: "Two of these four leaf spaces are filled. What fraction is filled?",
      hint: "Count the filled spaces, then count all the spaces.",
      visual: { kind: "fraction", filled: 2, total: 4 },
      options: ["1/2", "1/4", "3/4"],
      answer: "1/2",
    },
    {
      id: "three-quarters",
      prompt: "Which fraction is greater than the fraction shown?",
      hint: "When the bottom numbers match, the fraction with more filled parts is greater.",
      visual: { kind: "fraction", filled: 2, total: 4 },
      options: ["1/4", "2/4", "3/4"],
      answer: "3/4",
    },
    {
      id: "one-third",
      prompt: "One of these three acorn spaces is filled. What fraction is filled?",
      hint: "The bottom number tells how many equal spaces there are.",
      visual: { kind: "fraction", filled: 1, total: 3 },
      options: ["1/2", "1/3", "2/3"],
      answer: "1/3",
    },
  ]),
  "number-valley": activity("number-valley", "Find the missing number to help each trail continue.", [
    {
      id: "count-by-one",
      prompt: "What number comes next on this trail?",
      hint: "Say the numbers in order, one step at a time.",
      visual: { kind: "sequence", values: [3, 4, 5, null] },
      options: ["6", "7", "8"],
      answer: "6",
    },
    {
      id: "count-by-two",
      prompt: "What number is missing from this trail?",
      hint: "The trail jumps forward by two each time.",
      visual: { kind: "sequence", values: [2, 4, null, 8] },
      options: ["5", "6", "7"],
      answer: "6",
    },
    {
      id: "count-backward",
      prompt: "What number comes next as the trail goes down?",
      hint: "Count backwards one number at a time.",
      visual: { kind: "sequence", values: [9, 8, 7, null] },
      options: ["4", "5", "6"],
      answer: "6",
    },
  ]),
  "geometry-ridge": activity("geometry-ridge", "Study each mountain shape and choose its number of sides or corners.", [
    {
      id: "triangle-sides",
      prompt: "How many sides does this triangle have?",
      hint: "Trace around the outside and count each straight edge.",
      visual: { kind: "shape", shape: "triangle" },
      options: ["3", "4", "6"],
      answer: "3",
    },
    {
      id: "square-corners",
      prompt: "How many corners does this square have?",
      hint: "A corner is where two sides meet.",
      visual: { kind: "shape", shape: "square" },
      options: ["3", "4", "5"],
      answer: "4",
    },
    {
      id: "hexagon-sides",
      prompt: "How many sides does this hexagon have?",
      hint: "Count every straight edge around the shape.",
      visual: { kind: "shape", shape: "hexagon" },
      options: ["5", "6", "7"],
      answer: "6",
    },
  ]),
  "crystal-crater": activity("crystal-crater", "Use the crystal groups to solve each number sentence.", [
    {
      id: "two-plus-three",
      prompt: "How many crystals are there altogether?",
      hint: "Put the two groups together and count them all.",
      visual: { kind: "crystals", left: 2, operator: "+", right: 3 },
      options: ["4", "5", "6"],
      answer: "5",
    },
    {
      id: "seven-minus-two",
      prompt: "Seven crystals are here. Two roll away. How many are left?",
      hint: "Start with seven, then count back two.",
      visual: { kind: "crystals", left: 7, operator: "-", right: 2 },
      options: ["4", "5", "6"],
      answer: "5",
    },
    {
      id: "four-plus-four",
      prompt: "How many crystals are there altogether?",
      hint: "Count the first group, then count on with the second group.",
      visual: { kind: "crystals", left: 4, operator: "+", right: 4 },
      options: ["7", "8", "9"],
      answer: "8",
    },
  ]),
};

export function mathActivity(id: string): MathActivity | undefined {
  return Object.prototype.hasOwnProperty.call(MATH_ACTIVITIES, id)
    ? MATH_ACTIVITIES[id as MathRegionId]
    : undefined;
}

export function isCorrectMathAnswer(challenge: MathChallenge, answer: string): boolean {
  return challenge.answer === answer && challenge.options.includes(answer);
}
