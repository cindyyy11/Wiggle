import { expect, it } from "vitest";
import { sameOriginMutation } from "../../lib/api/sameOrigin";

it("compares the original request authority when Next normalizes its internal URL", () => {
  expect(sameOriginMutation(new Headers({ host: "127.0.0.1:3100", origin: "http://127.0.0.1:3100" }))).toBe(true);
  expect(sameOriginMutation(new Headers({ host: "wiggle.example", origin: "https://wiggle.example" }))).toBe(true);
});
it("rejects foreign, missing and malformed origins", () => {
  for (const origin of ["https://attacker.example", "null", "https://wiggle.example/extra", ""]) {
    expect(sameOriginMutation(new Headers({ host: "wiggle.example", origin }))).toBe(false);
  }
  expect(sameOriginMutation(new Headers({ origin: "https://wiggle.example" }))).toBe(false);
});
