export type AnswerPhase = "asking" | "celebrating" | "done";
export type AnswerState = { index: number; solved: number; phase: AnswerPhase };
/** The correct option for each puzzle, in order. Wrong options are anything else. */
export type AnswerRules = { answers: readonly string[] };
export type AnswerAction = { type: "select"; option: string } | { type: "advance" };

export const initialAnswerState: AnswerState = { index: 0, solved: 0, phase: "asking" };

/**
 * One region's puzzles, one after another. A wrong answer returns the same state object, so a caller can tell it from a
 * right one; only a right answer counts, and only once per puzzle.
 */
export function answerReducer(rules: AnswerRules, state: AnswerState, action: AnswerAction): AnswerState {
  switch (action.type) {
    case "select":
      if (state.phase !== "asking" || action.option !== rules.answers[state.index]) return state;
      return { ...state, solved: state.solved + 1, phase: "celebrating" };
    case "advance":
      if (state.phase !== "celebrating") return state;
      return state.index + 1 >= rules.answers.length
        ? { ...state, phase: "done" }
        : { ...state, index: state.index + 1, phase: "asking" };
  }
}
