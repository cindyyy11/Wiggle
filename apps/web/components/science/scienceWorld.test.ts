import { expect, it } from "vitest";
import { MAGNET_OBJECTS, SCIENCE_ZONES, resultForMagnetObject } from "./scienceWorld";

it("restores four available living lands", () => {
  expect(SCIENCE_ZONES.map(zone => zone.id)).toEqual(["magnet-lab", "animals", "colors", "life-cycle"]);
  expect(SCIENCE_ZONES.every(zone => zone.status === "available")).toBe(true);
});

it("classifies every tested object deterministically", () => {
  expect(resultForMagnetObject("paper-clip")).toBe("attracted");
  expect(resultForMagnetObject("iron-nail")).toBe("attracted");
  expect(resultForMagnetObject("wooden-block")).toBe("not-attracted");
  expect(resultForMagnetObject("plastic-button")).toBe("not-attracted");
  expect(MAGNET_OBJECTS).toHaveLength(4);
});
