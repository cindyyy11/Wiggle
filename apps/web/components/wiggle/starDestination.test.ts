import { expect, it } from "vitest";
import { constellationStarIds } from "@wiggle/contracts";
import { starDestination } from "./starDestination";

it("maps every constellation star id including planet explorers", () => {
  for (const id of constellationStarIds) {
    expect(starDestination(id).missionName.length).toBeGreaterThan(0);
  }
  expect(starDestination("science-explorer").missionName).toBe("Animal Types");
  expect(starDestination("numeria-explorer").missionName).toBe("Number Valley");
});
