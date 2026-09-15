import { describe, expect, it } from "vitest";
import { constellationStarIds } from "@wiggle/contracts";
import { starDestination } from "./starDestination";

describe("starDestination", () => {
  it("maps every constellation star to a real, reachable place", () => {
    for (const id of constellationStarIds) {
      const destination = starDestination(id);
      expect(destination.missionName).toBeTruthy();
      expect(destination.guideName).toBeTruthy();
      const href = destination.href("child-1");
      expect(href).toMatch(/^\/\?/);
      expect(href).toContain("child=child-1");
      // Never points at the still-placeholder science zones.
      expect(href).not.toMatch(/zone=sink-float/);
      expect(href).not.toMatch(/zone=ph-lab/);
    }
  });

  it("builds an href without a child id when none is supplied", () => {
    const href = starDestination("movement-explorer").href();
    expect(href).toContain("world=science");
    expect(href).toContain("zone=magnet-lab");
    expect(href).not.toContain("child=");
  });
});
