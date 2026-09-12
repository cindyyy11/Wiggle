import { expect, it } from "vitest";
import { MAGNET_OBJECTS, SCIENCE_ZONES, resultForMagnetObject } from "./scienceWorld";

it("has exactly six zones and only Magnet Lab is available", () => {
  expect(SCIENCE_ZONES).toHaveLength(6);
  expect(SCIENCE_ZONES.filter((zone) => zone.status === "available").map((zone) => zone.id))
    .toEqual(["magnet-lab"]);
});

it("keeps every approved Science zone field stable", () => {
  expect(SCIENCE_ZONES).toEqual([
    { id: "magnet-lab", name: "Magnet Lab", subtitle: "See what moves toward a magnet.", status: "available", color: "#ef8b78", scenePosition: [-1.2, 0.9, 0.4] },
    { id: "sink-float", name: "Sink & Float Bay", subtitle: "Will it sink or float?", status: "coming-soon", color: "#73c6e8", scenePosition: [1.3, 1.0, 0.2] },
    { id: "ph-lab", name: "pH Lab", subtitle: "Explore careful color changes.", status: "coming-soon", color: "#b68fd8", scenePosition: [-1.4, -0.5, 0.6] },
    { id: "animals", name: "Animal Arena", subtitle: "Meet different animal families.", status: "coming-soon", color: "#9dc99a", scenePosition: [1.25, -0.45, 0.4] },
    { id: "colors", name: "Colors Canyon", subtitle: "Mix and discover color.", status: "coming-soon", color: "#f4c95d", scenePosition: [-0.4, -1.25, 0.5] },
    { id: "life-cycle", name: "Life Cycle Garden", subtitle: "Watch life grow and change.", status: "coming-soon", color: "#7fbe86", scenePosition: [0.75, -1.2, 0.4] },
  ]);
});

it("classifies every tested object deterministically", () => {
  expect(resultForMagnetObject("paper-clip")).toBe("attracted");
  expect(resultForMagnetObject("iron-nail")).toBe("attracted");
  expect(resultForMagnetObject("wooden-block")).toBe("not-attracted");
  expect(resultForMagnetObject("plastic-button")).toBe("not-attracted");
  expect(MAGNET_OBJECTS).toHaveLength(4);
});
