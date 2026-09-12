// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { WiggleTwinAvatar } from "./WiggleTwinAvatar";

afterEach(cleanup);

describe("WiggleTwinAvatar", () => {
  it("labels itself with the state's child-safe line by default", () => {
    render(<WiggleTwinAvatar state="stuck" />);
    expect(screen.getByRole("img", { name: "Lexi thinks we should try this another way." })).toBeTruthy();
  });

  it("exposes the visual state as a data attribute for CSS-driven posture", () => {
    const { container } = render(<WiggleTwinAvatar state="mastered" />);
    expect(container.querySelector("figure")?.getAttribute("data-state")).toBe("mastered");
  });

  it("marks listening and speaking so the mission UI can show the right micro-interaction", () => {
    const { container } = render(<WiggleTwinAvatar state="ready" listening speaking />);
    const figure = container.querySelector("figure");
    expect(figure?.getAttribute("data-listening")).toBe("true");
    expect(figure?.getAttribute("data-speaking")).toBe("true");
  });

  it("never renders a raw number anywhere in its accessible name", () => {
    for (const state of ["ready", "overwhelmed", "stuck", "progressing", "needs_reset", "mastered"] as const) {
      render(<WiggleTwinAvatar state={state} />);
    }
    for (const img of screen.getAllByRole("img")) {
      expect(img.getAttribute("aria-label") || "").not.toMatch(/\d/);
    }
  });
});
