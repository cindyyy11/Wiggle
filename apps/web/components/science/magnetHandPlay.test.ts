import { describe, expect, it } from "vitest";
import {
  handPointerToTable,
  initialMagnetPlay,
  isWithinMagnetField,
  magnetPlayReducer,
  type MagnetPlayState,
} from "./magnetHandPlay";

const reduce = magnetPlayReducer;

describe("handPointerToTable", () => {
  it("maps mirrored NDC into the desk while reserving a forgiving table margin", () => {
    expect(handPointerToTable({ x: -1, y: -1 })).toEqual({ x: .07, y: .07 });
    expect(handPointerToTable({ x: 1, y: 1 })).toEqual({ x: .93, y: .93 });
  });

  it("clamps pointers that leave the desk", () => {
    expect(handPointerToTable({ x: 2, y: -2 })).toEqual({ x: 1, y: 0 });
  });
});

describe("isWithinMagnetField", () => {
  it("includes a forgiving attraction edge", () => {
    expect(isWithinMagnetField({ x: .4, y: .5 }, { x: .54, y: .58 })).toBe(true);
    expect(isWithinMagnetField({ x: .4, y: .5 }, { x: .58, y: .5 })).toBe(true);
  });

  it("excludes objects beyond the attraction field", () => {
    expect(isWithinMagnetField({ x: .4, y: .5 }, { x: .59, y: .5 })).toBe(false);
  });
});

describe("magnetPlayReducer", () => {
  it("records each observation once", () => {
    const observed = reduce(initialMagnetPlay, { type: "observe", id: "paper-clip" });
    expect(observed.explored).toContain("paper-clip");
    expect(reduce(observed, { type: "observe", id: "paper-clip" })).toEqual(observed);
  });

  it("records magnetic and non-magnetic objects", () => {
    expect(reduce(initialMagnetPlay, { type: "observe", id: "paper-clip" }).explored).toContain("paper-clip");
    expect(reduce(initialMagnetPlay, { type: "observe", id: "wooden-block" }).explored).toContain("wooden-block");
  });

  it("advances from exploring to sorting after all four objects", () => {
    const completeExplore = (["paper-clip", "iron-nail", "wooden-block", "plastic-button"] as const)
      .reduce((state, id) => reduce(state, { type: "observe", id }), initialMagnetPlay);
    expect(completeExplore.checkpoint).toBe("sort");
  });

  it("keeps an incorrectly sorted object available to try again", () => {
    const sorting: MagnetPlayState = { ...initialMagnetPlay, checkpoint: "sort" };
    const held = reduce(sorting, { type: "grab", id: "paper-clip" });
    const incorrect = reduce(held, { type: "drop", id: "paper-clip", target: "not-attracted" });
    expect(incorrect.held).toBeNull();
    expect(incorrect.sorted).not.toContain("paper-clip");
    expect(incorrect.checkpoint).toBe("sort");
  });

  it("only advances after all four objects are placed in their correct tray", () => {
    const sorting: MagnetPlayState = { ...initialMagnetPlay, checkpoint: "sort" };
    const sortedThree = ([
      ["paper-clip", "attracted"],
      ["iron-nail", "attracted"],
      ["wooden-block", "not-attracted"],
    ] as const).reduce((state, [id, target]) => {
      const held = reduce(state, { type: "grab", id });
      return reduce(held, { type: "drop", id, target });
    }, sorting);
    expect(sortedThree.checkpoint).toBe("sort");

    const completeSort = reduce(
      reduce(sortedThree, { type: "grab", id: "plastic-button" }),
      { type: "drop", id: "plastic-button", target: "not-attracted" },
    );
    expect(completeSort.checkpoint).toBe("hidden");
  });

  it("only lets the toolbox resolve the hidden-magnet checkpoint", () => {
    const hidden = { ...initialMagnetPlay, checkpoint: "hidden" as const };
    expect(reduce(hidden, { type: "investigate", target: "tent" }).foundHiddenMagnet).toBe(false);
    expect(reduce(hidden, { type: "investigate", target: "toolbox" }).foundHiddenMagnet).toBe(true);
  });
});
