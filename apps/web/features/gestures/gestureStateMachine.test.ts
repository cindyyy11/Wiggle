import { describe, expect, it } from "vitest";
import { GestureStateMachine } from "./gestureStateMachine";

describe("GestureStateMachine", () => {
  it("emits stable start, hold, and end phases", () => {
    const machine = new GestureStateMachine();
    expect(machine.update("pinch", 0)).toEqual([]);
    expect(machine.update("pinch", 150)).toEqual([{ type: "start", gesture: "pinch", at: 150 }]);
    expect(machine.update("pinch", 200)).toEqual([{ type: "hold", gesture: "pinch", at: 200 }]);
    expect(machine.update("point", 250)).toEqual([]);
    expect(machine.update("point", 400)).toEqual([{ type: "end", gesture: "pinch", at: 400 }]);
    expect(machine.update("point", 550)).toEqual([{ type: "start", gesture: "point", at: 550 }]);
  });
  it("keeps an active gesture through the 400ms lost-hand grace", () => {
    const machine = new GestureStateMachine();
    machine.update("fist", 0); machine.update("fist", 150);
    expect(machine.update(null, 500)).toEqual([]);
    expect(machine.gesture).toBe("fist");
    expect(machine.update(null, 550)).toEqual([{ type: "end", gesture: "fist", at: 550 }]);
  });
});
