import { describe, expect, it } from "vitest";
import { LEXI_BEACON_ID, PIZZA_PLATE_ID, PIZZA_SLICE_IDS, plateIsAccepting, slicePresentation } from "./Landmarks";
import type { PizzaPresentation } from "./world";

const pizza = (overrides: Partial<PizzaPresentation> = {}): PizzaPresentation => ({ visible: true, selectedSlices: [1], ...overrides });

describe("physical pizza presentation", () => {
  it("uses stable scene object ids for every slice, plate, and Lexi beacon", () => {
    expect(PIZZA_SLICE_IDS).toEqual(["pizza-slice-1", "pizza-slice-2", "pizza-slice-3", "pizza-slice-4"]);
    expect(PIZZA_PLATE_ID).toBe("pizza-plate");
    expect(LEXI_BEACON_ID).toBe("lexi-beacon");
  });

  it("preserves selected-slice fallback while allowing controlled held, focused, and placed states", () => {
    expect(slicePresentation(pizza(), 1)).toEqual({ id: "pizza-slice-2", state: "placed" });
    expect(slicePresentation(pizza({ slices: [{ id: "pizza-slice-2", state: "held", focused: true }] }), 1)).toEqual({ id: "pizza-slice-2", state: "held", focused: true });
  });

  it("highlights the plate for a focused or held slice target", () => {
    expect(plateIsAccepting(pizza())).toBe(false);
    expect(plateIsAccepting(pizza({ plate: { focused: true } }))).toBe(true);
    expect(plateIsAccepting(pizza({ slices: [{ id: "pizza-slice-1", state: "held" }] }))).toBe(true);
  });
});
