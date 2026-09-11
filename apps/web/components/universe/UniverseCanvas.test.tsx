// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { UniverseCanvas } from "./UniverseCanvas";
import { resolveQuality } from "./world";
import type { InputRef } from "./world";

const sceneState = vi.hoisted(() => ({ input: null as InputRef | null }));

vi.mock("next/dynamic", () => ({ default: () => function Scene(props: { mode: string; reducedMotion: boolean; onContextLost: () => void; input: InputRef }) {
  sceneState.input = props.input;
  return <div data-testid="scene" data-mode={props.mode} data-reduced-motion={String(props.reducedMotion)}><button onClick={props.onContextLost}>Lose WebGL</button></div>;
} }));

beforeEach(() => {
  Object.defineProperty(window, "matchMedia", { writable: true, value: vi.fn().mockReturnValue({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }) });
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({ getExtension: () => null } as never);
  Object.defineProperty(HTMLElement.prototype, "setPointerCapture", { configurable: true, value: vi.fn() });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe("Numeria quality and accessible controls", () => {
  it("chooses a map without WebGL and reduces detail on constrained devices", () => {
    expect(resolveQuality("auto", false, 8, 8)).toBe("fallback");
    expect(resolveQuality("auto", true, 2, 8)).toBe("fallback");
    expect(resolveQuality("auto", true, 4, 8)).toBe("low");
    expect(resolveQuality("auto", true, 8, 8)).toBe("high");
    expect(resolveQuality("low", true, 8, 8)).toBe("low");
  });

  it("keeps every landmark and the mission callback available in the 2D replacement", () => {
    const select = vi.fn(); const start = vi.fn();
    render(<UniverseCanvas quality="fallback" onLandmarkSelect={select} onMissionStart={start} />);
    expect(screen.getByRole("img", { name: /Numeria map/ })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Visit Fraction Forest/ }));
    expect(select).toHaveBeenCalledWith("fraction-forest");
    fireEvent.click(screen.getByRole("button", { name: "Start fractions mission" }));
    expect(start).toHaveBeenCalledOnce();
    expect(screen.getByRole("button", { name: /Visit Geometry Ridge/ })).toBeTruthy();
  });

  it("changes camera mode through the same accessible controls", async () => {
    const change = vi.fn();
    render(<UniverseCanvas onModeChange={change} />);
    fireEvent.click(screen.getByRole("button", { name: "Follow explorer" }));
    expect(change).toHaveBeenCalledWith("follow");
    expect((await screen.findByTestId("scene")).getAttribute("data-mode")).toBe("follow");
  });

  it("honors controlled camera mode and reduced motion", async () => {
    const view = render(<UniverseCanvas mode="mission" reducedMotion />);
    expect((await screen.findByTestId("scene")).getAttribute("data-mode")).toBe("mission");
    expect(screen.getByTestId("scene").getAttribute("data-reduced-motion")).toBe("true");
    view.rerender(<UniverseCanvas mode="globe" reducedMotion />);
    expect(screen.getByTestId("scene").getAttribute("data-mode")).toBe("globe");
  });

  it("recovers from a lost graphics context with working mission controls", async () => {
    const start = vi.fn();
    render(<UniverseCanvas onMissionStart={start} />);
    fireEvent.click(await screen.findByRole("button", { name: "Lose WebGL" }));
    expect(screen.queryByTestId("scene")).toBeNull();
    expect(screen.getByRole("img", { name: /Numeria map/ })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Start fractions mission" }));
    expect(start).toHaveBeenCalledOnce();
  });

  it("routes keyboard motion through the frame-owned controller and clears held input on blur", async () => {
    render(<UniverseCanvas />);
    await screen.findByTestId("scene");
    const pad = screen.getByRole("group", { name: /Move explorer/ });
    fireEvent.keyDown(pad, { key: "ArrowUp" });
    fireEvent.keyDown(pad, { key: "Shift" });
    expect(sceneState.input?.current.keys.has("arrowup")).toBe(true);
    expect(sceneState.input?.current.keys.has("shift")).toBe(true);
    fireEvent.keyDown(pad, { key: " " });
    expect(sceneState.input?.current.hop).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Run" }));
    expect(sceneState.input?.current.running).toBe(true);
    fireEvent.blur(window);
    expect(sceneState.input?.current.keys.size).toBe(0);
    expect(sceneState.input?.current.hop).toBe(false);
    expect(sceneState.input?.current.running).toBe(false);
  });

  it("retains controlled pizza selection in fallback and emits the same slice commands", () => {
    const toggle = vi.fn();
    render(<UniverseCanvas quality="fallback" pizza={{ visible: true, selectedSlices: [0, 1, 2], onSliceSelect: toggle }} />);
    const slice = screen.getByRole("button", { name: "Slice 1" });
    expect(slice.getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(slice);
    expect(toggle).toHaveBeenCalledWith(0);
    expect(screen.getByRole("button", { name: "Slice 4" }).getAttribute("aria-pressed")).toBe("false");
  });

  it("keeps a newly held pointer direction when focus moves between pad buttons", async () => {
    render(<UniverseCanvas />);
    await screen.findByTestId("scene");
    const forward = screen.getByRole("button", { name: "Walk forward" });
    const right = screen.getByRole("button", { name: "Walk right" });
    fireEvent.pointerDown(forward, { pointerId: 1 });
    fireEvent.focus(forward);
    fireEvent.pointerUp(forward, { pointerId: 1 });
    // Browsers dispatch pointerdown before the default focusout/focusin action.
    fireEvent.pointerDown(right, { pointerId: 2 });
    fireEvent.blur(forward, { relatedTarget: right });
    fireEvent.focus(right, { relatedTarget: forward });
    expect(sceneState.input?.current.horizontal).toBe(1);
    expect(sceneState.input?.current.vertical).toBe(0);
    fireEvent.pointerUp(right, { pointerId: 2 });
    expect(sceneState.input?.current.horizontal).toBe(0);
  });

  it("clears keys only when focus leaves the pad without cancelling captured pointer input", async () => {
    render(<UniverseCanvas />);
    await screen.findByTestId("scene");
    const pad = screen.getByRole("group", { name: /Move explorer/ });
    const right = screen.getByRole("button", { name: "Walk right" });
    const hop = screen.getByRole("button", { name: "Hop" });
    fireEvent.keyDown(pad, { key: "w" });
    fireEvent.pointerDown(right, { pointerId: 1 });
    fireEvent.blur(pad, { relatedTarget: right });
    expect(sceneState.input?.current.keys.has("w")).toBe(true);
    expect(sceneState.input?.current.horizontal).toBe(1);
    fireEvent.blur(right, { relatedTarget: hop });
    expect(sceneState.input?.current.keys.size).toBe(0);
    expect(sceneState.input?.current.horizontal).toBe(1);
    fireEvent.lostPointerCapture(right, { pointerId: 1 });
    expect(sceneState.input?.current.horizontal).toBe(0);
  });

  it("cancels an external destination with null but preserves local travel when omitted", async () => {
    const destination = { latitude: .6, longitude: -.5 };
    const view = render(<UniverseCanvas destination={destination} />);
    await screen.findByTestId("scene");
    expect(sceneState.input?.current.destination).toEqual(destination);
    view.rerender(<UniverseCanvas />);
    expect(sceneState.input?.current.destination).toEqual(destination);
    view.rerender(<UniverseCanvas destination={null} />);
    expect(sceneState.input?.current.destination).toBeNull();
  });
});
