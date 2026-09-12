import { expect, it } from "vitest";
import { MAGNET_HOME, MAGNET_OBJECTS, SCIENCE_ZONES, resultForMagnetObject } from "./scienceWorld";

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

it("keeps the magnet home pad outside every object's attraction field", () => {
  for (const object of MAGNET_OBJECTS) {
    const [x, y] = object.scenePosition;
    expect(Math.hypot(MAGNET_HOME.x - x, MAGNET_HOME.y - y)).toBeGreaterThan(.18);
  }
});

it("spaces objects farther apart than one magnet field diameter", () => {
  for (let index = 0; index < MAGNET_OBJECTS.length; index++) {
    for (let other = index + 1; other < MAGNET_OBJECTS.length; other++) {
      const [ax, ay] = MAGNET_OBJECTS[index].scenePosition;
      const [bx, by] = MAGNET_OBJECTS[other].scenePosition;
      expect(Math.hypot(ax - bx, ay - by)).toBeGreaterThan(.36);
    }
  }
});
