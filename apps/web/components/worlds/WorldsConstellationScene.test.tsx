// @vitest-environment jsdom
import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import Scene from "./WorldsConstellationScene";

const canvasState = vi.hoisted(() => ({ fallback: undefined as React.ReactNode }));
const rendererCanvas = document.createElement("canvas");

vi.mock("@react-three/fiber", () => ({
  Canvas: ({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) => {
    canvasState.fallback = fallback;
    return <div data-testid="healthy-r3f-canvas">{children}{fallback}</div>;
  },
  useFrame: vi.fn(),
  useThree: () => ({ gl: { domElement: rendererCanvas } }),
}));

vi.mock("./PlanetCarousel", () => ({ PlanetCarousel: () => null, WORLDS_CAMERA_Z: 9.4 }));
vi.mock("./ConstellationDressings", () => ({ ConstellationDressings: () => null }));

afterEach(() => {
  cleanup();
  canvasState.fallback = undefined;
  vi.clearAllMocks();
});

it("does not turn a healthy R3F Canvas into a context-loss fallback", () => {
  const onContextLost = vi.fn();
  render(<Scene
    activeWorld={null}
    quality="high"
    reducedMotion={false}
    counts={{ stars: 1, orbitalRocks: 1, cloudPuffs: 1, mathTrees: 1, scienceFragments: 1 }}
    onSelect={vi.fn()}
    onActiveWorldChange={vi.fn()}
    onQualityChange={vi.fn()}
    onContextLost={onContextLost}
  />);

  expect(screen.getByTestId("healthy-r3f-canvas")).toBeTruthy();
  expect(canvasState.fallback).toBeUndefined();
  expect(onContextLost).not.toHaveBeenCalled();
});
