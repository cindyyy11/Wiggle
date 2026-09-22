// @vitest-environment jsdom
import { Fragment, type ReactElement } from "react";
import { cleanup, renderHook } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { NUMERIA_REGION_COLORS, NUMERIA_REGION_COUNT, Numeria } from "./Numeria";
import { MathLivingScenery } from "./MathLivingScenery";
import { ScienceLandScenery } from "../science/ScienceLandScenery";

afterEach(cleanup);

function terrain(element: ReactElement) {
  return (element.props as { children: ReactElement[] }).children[0].props as {
    onClick: (event: { delta: number; stopPropagation: () => void; point: { x: number; y: number; z: number } }) => void;
    geometry: { getAttribute: (name: string) => { array: ArrayLike<number> } };
  };
}

/** The math theme wraps its scenery in a fragment, so flatten one level before looking for a layer. */
function sceneryChildren(element: ReactElement) {
  return (element.props as { children: ReactElement[] }).children.flatMap(child =>
    child?.type === Fragment ? (child.props as { children: ReactElement[] }).children : [child]);
}

it("preserves ordinary Numeria destination clicks and ignores drags", () => {
  const onDestination = vi.fn();
  const { result } = renderHook(() => Numeria({ quality: "low", dimmed: false, onDestination }));
  const event = { delta: 0, stopPropagation: vi.fn(), point: { x: 0, y: 0, z: 3 } };
  terrain(result.current).onClick(event);
  expect(onDestination).toHaveBeenCalledOnce();
  expect(event.stopPropagation).toHaveBeenCalledOnce();
  terrain(result.current).onClick({ ...event, delta: 8 });
  expect(onDestination).toHaveBeenCalledOnce();
});

it("uses four distinct colors for the four Maths regions", () => {
  expect(NUMERIA_REGION_COLORS).toHaveLength(4);
  expect(NUMERIA_REGION_COUNT).toBe(4);
  expect(new Set(NUMERIA_REGION_COLORS).size).toBe(4);
});

it("uses saved science scenery and lets preview clicks bubble to the carousel", () => {
  const onDestination = vi.fn();
  const { result } = renderHook(() => Numeria({ quality: "low", dimmed: false, theme: "science", preview: true, onDestination }));
  const event = { delta: 0, stopPropagation: vi.fn(), point: { x: 0, y: 0, z: 3 } };
  terrain(result.current).onClick(event);
  expect(onDestination).not.toHaveBeenCalled();
  expect(event.stopPropagation).not.toHaveBeenCalled();
  const children = (result.current.props as { children: ReactElement[] }).children;
  expect(children.some(child => child?.type === ScienceLandScenery)).toBe(true);
  expect(terrain(result.current).geometry.getAttribute("color").array.length).toBeGreaterThan(0);
});

it("fills the math globe with the whole-globe scenery layer and keeps it off the science theme", () => {
  const onDestination = vi.fn();
  const math = renderHook(() => Numeria({ quality: "low", dimmed: false, onDestination }));
  expect(sceneryChildren(math.result.current).some(child => child?.type === MathLivingScenery)).toBe(true);
  const science = renderHook(() => Numeria({ quality: "low", dimmed: false, theme: "science", onDestination }));
  expect(sceneryChildren(science.result.current).some(child => child?.type === MathLivingScenery)).toBe(false);
  expect(sceneryChildren(science.result.current).some(child => child?.type === ScienceLandScenery)).toBe(true);
});

it("does not chase the cursor: hovering the planet sends the explorer nowhere", () => {
  const onDestination = vi.fn();
  const { result } = renderHook(() => Numeria({ quality: "low", dimmed: false, onDestination }));
  const props = terrain(result.current) as unknown as { onPointerMove?: unknown; onPointerOut?: unknown };
  expect(props.onPointerMove).toBeUndefined();
  expect(props.onPointerOut).toBeUndefined();
  expect(onDestination).not.toHaveBeenCalled();
});
