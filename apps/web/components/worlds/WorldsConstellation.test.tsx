// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { WorldsConstellation, worldDecorationCounts } from "./WorldsConstellation";
import { WorldSelector } from "./WorldSelector";

const sceneState = vi.hoisted(() => ({ reducedMotion: false }));

vi.mock("./WorldsConstellationScene", () => ({
  default: (props: { reducedMotion: boolean }) => {
    sceneState.reducedMotion = props.reducedMotion;
    return <div data-testid="worlds-constellation-scene" data-reduced-motion={String(props.reducedMotion)} />;
  },
}));

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

beforeEach(() => {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: vi.fn().mockReturnValue({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }),
  });
});

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

it("observes reduced-motion preference and passes it to the decorative scene", async () => {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: vi.fn().mockReturnValue({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }),
  });
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({ getExtension: () => null } as never);

  const view = render(<WorldsConstellation selectedWorld="science" quality="low" onSelect={vi.fn()} />);

  await waitFor(() => expect(screen.getByTestId("worlds-constellation-scene").getAttribute("data-reduced-motion")).toBe("true"));
  expect(sceneState.reducedMotion).toBe(true);
  expect(view.container.querySelector('[data-reduced-motion="true"]')).toBeTruthy();
});
