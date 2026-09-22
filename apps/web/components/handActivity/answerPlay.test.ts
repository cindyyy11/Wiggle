import { describe, expect, it } from "vitest";
import { answerReducer, initialAnswerState, type AnswerAction, type AnswerRules, type AnswerState } from "./answerPlay";

const rules: AnswerRules = { answers: ["6", "6", "5"] };
const run = (state: AnswerState, ...actions: AnswerAction[]) => actions.reduce((next, action) => answerReducer(rules, next, action), state);
const select = (option: string): AnswerAction => ({ type: "select", option });
const advance: AnswerAction = { type: "advance" };

describe("answerReducer", () => {
  it("starts on the first puzzle, asking", () => {
    expect(initialAnswerState).toEqual({ index: 0, solved: 0, phase: "asking" });
  });

  it("leaves the state exactly as it was for a wrong answer, so the caller can tell", () => {
    expect(run(initialAnswerState, select("7"))).toBe(initialAnswerState);
    expect(run(initialAnswerState, select("not an option"))).toBe(initialAnswerState);
  });

  it("celebrates a right answer and counts it", () => {
    expect(run(initialAnswerState, select("6"))).toEqual({ index: 0, solved: 1, phase: "celebrating" });
  });

  it("ignores further answers while celebrating, so a puzzle is only counted once", () => {
    const celebrating = run(initialAnswerState, select("6"));
    expect(run(celebrating, select("6"))).toBe(celebrating);
  });

  it("moves to the next puzzle only after celebrating", () => {
    expect(run(initialAnswerState, advance)).toBe(initialAnswerState);
    expect(run(initialAnswerState, select("6"), advance)).toEqual({ index: 1, solved: 1, phase: "asking" });
  });

  it("judges each puzzle against its own answer", () => {
    const second = run(initialAnswerState, select("6"), advance);
    expect(run(second, select("5"))).toBe(second);
    expect(run(second, select("6")).solved).toBe(2);
  });

  it("finishes after the last puzzle is solved and advanced", () => {
    const done = run(initialAnswerState, select("6"), advance, select("6"), advance, select("5"), advance);
    expect(done).toEqual({ index: 2, solved: 3, phase: "done" });
  });

  it("ignores everything once done", () => {
    const done = run(initialAnswerState, select("6"), advance, select("6"), advance, select("5"), advance);
    expect(run(done, select("5"))).toBe(done);
    expect(run(done, advance)).toBe(done);
  });
});
