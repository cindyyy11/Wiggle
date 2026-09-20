// @vitest-environment jsdom
import type { ReactElement } from "react";
import { cleanup, renderHook } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { NUMERIA_REGION_COLORS, NUMERIA_REGION_COUNT, Numeria } from "./Numeria";
import { ScienceLandScenery } from "../science/ScienceLandScenery";

afterEach(cleanup);

function terrain(element: ReactElement) {
  return (element.props as { children: ReactElement[] }).children[0].props as {
    onClick: (event: { delta: number; stopPropagation: () => void; point: { x: number; y: number; z: number } }) => void;
    geometry: { getAttribute: (name: string) => { array: ArrayLike<number> } };
  };
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

it("flies the explorer toward a hovering mouse or sliding finger, but not while a mouse drags", () => {
  const onFly = vi.fn();
  const { result } = renderHook(() => Numeria({ quality: "low", dimmed: false, onDestination: vi.fn(), onFly }));
  const props = terrain(result.current) as unknown as {
    onPointerMove: (event: { pointerType: string; buttons: number; point: { x: number; y: number; z: number } }) => void;
    onPointerOut: () => void;
  };
  const point = { x: 0, y: 0, z: 3 };
  props.onPointerMove({ pointerType: "mouse", buttons: 0, point });
  expect(onFly).toHaveBeenLastCalledWith({ latitude: 0, longitude: 0 });
  props.onPointerMove({ pointerType: "touch", buttons: 1, point });
  expect(onFly).toHaveBeenCalledTimes(2);
  props.onPointerMove({ pointerType: "mouse", buttons: 1, point });
  expect(onFly).toHaveBeenCalledTimes(2);
  props.onPointerOut();
  expect(onFly).toHaveBeenLastCalledWith(null);
});

it("never flies from a preview planet", () => {
  const onFly = vi.fn();
  const { result } = renderHook(() => Numeria({ quality: "low", dimmed: false, theme: "science", preview: true, onDestination: vi.fn(), onFly }));
  (terrain(result.current) as unknown as { onPointerMove: (event: unknown) => void }).onPointerMove({ pointerType: "mouse", buttons: 0, point: { x: 0, y: 0, z: 3 } });
  expect(onFly).not.toHaveBeenCalled();
});
