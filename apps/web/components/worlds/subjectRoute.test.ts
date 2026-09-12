import { expect, it } from "vitest";
import {
  DEFAULT_SCIENCE_ZONE,
  SUBJECT_WORLDS,
  buildWorldHref,
  parseSubjectRoute,
} from "./subjectRoute";

it("models four subject planets with only Science and Numeria enterable", () => {
  expect(SUBJECT_WORLDS.map(world => [world.id, world.status])).toEqual([
    ["science", "available"],
    ["math", "available"],
    ["english", "coming-soon"],
    ["bm", "coming-soon"],
  ]);
  expect(DEFAULT_SCIENCE_ZONE).toBe("magnet-lab");
});

it("normalizes invalid or locked routes to the Worlds selector", () => {
  expect(parseSubjectRoute(new URLSearchParams("world=english&child=owned"))).toEqual({
    world: null,
    child: "owned",
  });
  expect(parseSubjectRoute(new URLSearchParams("world=science&zone=unknown"))).toEqual({
    world: "science",
    zone: "magnet-lab",
  });
});

it("serializes an enterable route without dropping the owned child", () => {
  expect(buildWorldHref({ world: "science", zone: "magnet-lab", child: "owned" }))
    .toBe("/?child=owned&world=science&zone=magnet-lab");
});
