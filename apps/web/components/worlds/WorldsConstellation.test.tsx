// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { WorldsConstellation, worldDecorationCounts } from "./WorldsConstellation";
import { WorldSelector } from "./WorldSelector";

vi.mock("./WorldsConstellationScene", () => ({
  default: () => <div data-testid="worlds-constellation-scene" />,
}));

afterEach(cleanup);

it("keeps DOM world controls available when graphics fall back", () => {
  const onSelect = vi.fn();
  render(<>
    <WorldsConstellation selectedWorld="science" quality="fallback" onSelect={onSelect} />
    <WorldSelector selectedWorld="science" onSelect={onSelect} statusMessage="" />
  </>);

  fireEvent.click(screen.getByRole("button", { name: "Explore Numeria" }));
  expect(onSelect).toHaveBeenCalledWith("math");
  expect(screen.queryByTestId("worlds-constellation-scene")).toBeNull();
});

it("uses a smaller decoration budget at low quality", () => {
  expect(worldDecorationCounts("high")).toEqual({ stars: 40, debris: 40 });
  expect(worldDecorationCounts("low")).toEqual({ stars: 18, debris: 18 });
});
