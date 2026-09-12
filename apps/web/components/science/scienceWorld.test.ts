import { expect, it } from "vitest";
import { MAGNET_OBJECTS, SCIENCE_ZONES, resultForMagnetObject } from "./scienceWorld";

it("has exactly six zones and only Magnet Lab is available", () => {
  expect(SCIENCE_ZONES).toHaveLength(6);
  expect(SCIENCE_ZONES.filter((zone) => zone.status === "available").map((zone) => zone.id))
    .toEqual(["magnet-lab"]);
});

it("keeps the approved Magnet Lab zone copy stable", () => {
  expect(SCIENCE_ZONES[0]).toMatchObject({
    id: "magnet-lab",
    name: "Magnet Lab",
    subtitle: "See what moves toward a magnet.",
  });
});

it("classifies every tested object deterministically", () => {
  expect(resultForMagnetObject("paper-clip")).toBe("attracted");
  expect(resultForMagnetObject("iron-nail")).toBe("attracted");
  expect(resultForMagnetObject("wooden-block")).toBe("not-attracted");
  expect(resultForMagnetObject("plastic-button")).toBe("not-attracted");
  expect(MAGNET_OBJECTS).toHaveLength(4);
});
