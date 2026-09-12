import { createRequire } from "node:module";
import { expect, it } from "vitest";

const require = createRequire(import.meta.url);

it("runs the patched Next 15 maintenance line with matching patched React packages", () => {
  // https://nextjs.org/blog/august-2026-security-release
  const [major, minor, patch] = require("next/package.json").version.split(".").map(Number);
  expect([major, minor]).toEqual([15, 5]);
  expect(patch).toBeGreaterThanOrEqual(24);
  const react = require("react/package.json").version;
  expect(require("react-dom/package.json").version).toBe(react);
  const [reactMajor, reactMinor, reactPatch] = react.split(".").map(Number);
  expect([reactMajor, reactMinor]).toEqual([19, 1]);
  expect(reactPatch).toBeGreaterThanOrEqual(9);
});
