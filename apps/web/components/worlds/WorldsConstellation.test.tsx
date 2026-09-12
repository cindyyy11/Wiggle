// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { WorldsConstellation, worldDecorationCounts } from "./WorldsConstellation";
import { WorldSelector } from "./WorldSelector";

const sceneState = vi.hoisted(() => ({ reducedMotion: false }));

vi.mock("./WorldsConstellationScene", () => ({
  default: (props: {
    activeWorld: string | null;
    quality: "high" | "low";
    reducedMotion: boolean;
    counts: Record<string, number>;
    onSelect: (world: "science" | "math" | "english" | "bm") => void;
    onContextLost: () => void;
  }) => {
    sceneState.reducedMotion = props.reducedMotion;
    return <div data-testid="worlds-constellation-scene" data-reduced-motion={String(props.reducedMotion)}>
      {(["math", "science", "english", "bm"] as const).map(world => <button key={world} type="button" onClick={() => props.onSelect(world)}>
        Select modeled {world}
      </button>)}
      <button type="button" onClick={props.onContextLost}>Lose constellation context</button>
    </div>;
  },
}));

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

beforeEach(() => {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: vi.fn().mockReturnValue({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }),
  });
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({ getExtension: () => null } as never);
});

it("keeps DOM world controls available when graphics fall back", () => {
  const onSelect = vi.fn();
  render(<>
    <WorldsConstellation activeWorld="science" quality="fallback" onActiveWorldChange={vi.fn()} onSelect={onSelect} />
    <WorldSelector selectedWorld="science" onSelect={onSelect} statusMessage="" />
  </>);

  fireEvent.click(screen.getByRole("button", { name: "Explore Numeria" }));
  expect(onSelect).toHaveBeenCalledWith("math");
  expect(screen.queryByTestId("worlds-constellation-scene")).toBeNull();
});

it("uses a smaller decoration budget at low quality", () => {
  expect(worldDecorationCounts("high")).toEqual({ stars: 96, debris: 24 });
  expect(worldDecorationCounts("low")).toEqual({ stars: 36, debris: 8 });
});

it("forwards every modeled world selection, including locked worlds", async () => {
  const onSelect = vi.fn();
  render(<WorldsConstellation activeWorld={null} quality="low" onActiveWorldChange={vi.fn()} onSelect={onSelect} />);

  for (const world of ["math", "science", "english", "bm"] as const) {
    fireEvent.click(await screen.findByRole("button", { name: `Select modeled ${world}` }));
  }
  expect(onSelect.mock.calls.map(([world]) => world)).toEqual(["math", "science", "english", "bm"]);
});

it("changes to fallback after constellation context loss", async () => {
  render(<WorldsConstellation activeWorld={null} quality="low" onActiveWorldChange={vi.fn()} onSelect={vi.fn()} />);
  fireEvent.click(await screen.findByRole("button", { name: "Lose constellation context" }));
  expect(screen.queryByTestId("worlds-constellation-scene")).toBeNull();
  expect(document.querySelector('[data-quality="fallback"]')).toBeTruthy();
});

it("observes reduced-motion preference and passes it to the decorative scene", async () => {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: vi.fn().mockReturnValue({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }),
  });
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({ getExtension: () => null } as never);

  const view = render(<WorldsConstellation activeWorld="science" quality="low" onActiveWorldChange={vi.fn()} onSelect={vi.fn()} />);

  await waitFor(() => expect(screen.getByTestId("worlds-constellation-scene").getAttribute("data-reduced-motion")).toBe("true"));
  expect(sceneState.reducedMotion).toBe(true);
  expect(view.container.querySelector('[data-reduced-motion="true"]')).toBeTruthy();
});

it("defaults to motion when matchMedia is unavailable", () => {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: undefined,
  });
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({ getExtension: () => null } as never);

  render(<WorldsConstellation activeWorld="science" quality="low" onActiveWorldChange={vi.fn()} onSelect={vi.fn()} />);

  expect(screen.getByTestId("worlds-constellation-scene").getAttribute("data-reduced-motion")).toBe("false");
});
