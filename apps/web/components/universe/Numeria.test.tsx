// @vitest-environment jsdom
import type { ReactElement } from "react";
import { cleanup, renderHook } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { Numeria } from "./Numeria";
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

it("uses saved science scenery and lets preview clicks bubble to the carousel", () => {
  const onDestination = vi.fn();
  const { result } = renderHook(() => Numeria({ quality: "low", dimmed: false, theme: "science", preview: true, onDestination }));
  const event = { delta: 0, stopPropagation: vi.fn(), point: { x: 0, y: 0, z: 3 } };
  terrain(result.current).onClick(event);
  expect(onDestination).not.toHaveBeenCalled();
  expect(event.stopPropagation).not.toHaveBeenCalled();
  const children = (result.current.props as { children: ReactElement[] }).children;
  expect(children[1].type).toBe(ScienceLandScenery);
  expect(terrain(result.current).geometry.getAttribute("color").array.length).toBeGreaterThan(0);
});
