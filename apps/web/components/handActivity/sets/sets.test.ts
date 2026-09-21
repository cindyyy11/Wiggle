import { describe, expect, it } from "vitest";
import { SCIENCE_ACTIVITIES } from "../../science/scienceActivities";
import { BENCH_SETS } from "./index";

describe.each(Object.entries(BENCH_SETS).filter(([, set]) => set))("%s bench set", (land, set) => {
  const activity = SCIENCE_ACTIVITIES[land as keyof typeof SCIENCE_ACTIVITIES];

  it("is keyed by a real land and labelled", () => {
    expect(activity).toBeTruthy();
    expect(set!.land).toBe(land);
    expect(set!.label).toMatch(/workbench$/);
  });

  it("offers exactly the lesson's items and targets", () => {
    expect(set!.items.map((item) => item.id).sort()).toEqual(activity.items.map((item) => item.id).sort());
    expect(set!.targets.map((target) => target.id).sort()).toEqual(activity.targets.map((target) => target.id).sort());
  });

  it("keeps every hit area on the bench and clear of every other", () => {
    const zones = [
      ...set!.items.map((item) => ({ id: item.id, at: item.home, radius: item.radius })),
      ...set!.targets.map((target) => ({ id: target.id, at: target.at, radius: target.radius })),
    ];
    for (const zone of zones) {
      expect(zone.at.x - zone.radius).toBeGreaterThanOrEqual(0);
      expect(zone.at.x + zone.radius).toBeLessThanOrEqual(1);
      expect(zone.at.y - zone.radius).toBeGreaterThanOrEqual(0);
      expect(zone.at.y + zone.radius).toBeLessThanOrEqual(1);
    }
    for (let a = 0; a < zones.length; a++) {
      for (let b = a + 1; b < zones.length; b++) {
        const gap = Math.hypot(zones[a].at.x - zones[b].at.x, zones[a].at.y - zones[b].at.y);
        expect(gap, `${zones[a].id} overlaps ${zones[b].id}`).toBeGreaterThanOrEqual(zones[a].radius + zones[b].radius);
      }
    }
  });
});
