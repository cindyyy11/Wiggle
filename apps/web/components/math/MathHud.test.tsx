// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { MathHud } from "./MathHud";

afterEach(cleanup);

it("lets learners visit regions and explore the selected activity", () => {
  const onRegionSelect = vi.fn();
  const onExplore = vi.fn();

  render(
    <MathHud
      selectedRegion="fraction-forest"
      completedRegions={new Set(["fraction-forest"])}
      onRegionSelect={onRegionSelect}
      onExplore={onExplore}
      onBackToWorlds={vi.fn()}
    />,
  );

  expect(screen.getAllByRole("button", { name: /^Visit / })).toHaveLength(4);
  const completedRegion = screen.getByRole("button", { name: "Visit Fraction Forest" });
  expect(completedRegion.getAttribute("aria-pressed")).toBe("true");
  expect(completedRegion.getAttribute("aria-describedby")).toBe("math-region-fraction-forest-completion");
  const completionDescription = document.getElementById("math-region-fraction-forest-completion");
  expect(completionDescription?.textContent).toBe("Complete");
  expect(completionDescription?.className).toContain("screenReaderOnly");
  expect(screen.getByRole("button", { name: "Visit Number Valley" }).hasAttribute("aria-describedby")).toBe(false);
  expect(screen.getByRole("heading", { name: "Fraction Forest" })).toBeTruthy();

  fireEvent.click(screen.getByRole("button", { name: "Visit Number Valley" }));
  expect(onRegionSelect).toHaveBeenCalledWith("number-valley");

  fireEvent.click(screen.getByRole("button", { name: "Explore Fraction Forest" }));
  expect(onExplore).toHaveBeenCalledOnce();
});

it("returns to Worlds and announces completion progress politely", () => {
  const onBackToWorlds = vi.fn();

  render(
    <MathHud
      selectedRegion="crystal-crater"
      completedRegions={new Set(["fraction-forest", "number-valley"])}
      onRegionSelect={vi.fn()}
      onExplore={vi.fn()}
      onBackToWorlds={onBackToWorlds}
    />,
  );

  expect(screen.getByRole("status").getAttribute("aria-live")).toBe("polite");
  expect(screen.getByRole("status").textContent).toContain("2 of 4 regions complete");
  fireEvent.click(screen.getByRole("button", { name: "Back to Worlds" }));
  expect(onBackToWorlds).toHaveBeenCalledOnce();
});
