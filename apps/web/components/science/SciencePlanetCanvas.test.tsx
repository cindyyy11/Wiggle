// @vitest-environment jsdom
import React from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { SciencePlanetCanvas, scienceDecorationCounts } from "./SciencePlanetCanvas";

const webgl = vi.hoisted(() => ({ supported: true, probeCalls: 0 }));
const sceneState = vi.hoisted(() => ({ throwOnRender: false, useActualScene: false }));
const rendererState = vi.hoisted(() => ({ canvasFallback: false, canvasRenders: 0, fallbackRenders: 0, domElement: null as HTMLCanvasElement | null }));

vi.mock("./ScienceDiorama", () => ({ ScienceDiorama: () => null }));

vi.mock("next/dynamic", async () => {
  const { default: ActualSciencePlanetScene } = await vi.importActual<typeof import("./SciencePlanetScene")>("./SciencePlanetScene");
  return { default: () => function Scene(props: { onZoneSelect: (zone: "ph-lab") => void; onContextLost: () => void }) {
    if (sceneState.throwOnRender) throw new Error("Science scene failed to render");
    if (sceneState.useActualScene) return <ActualSciencePlanetScene {...props as React.ComponentProps<typeof ActualSciencePlanetScene>} />;
    return <div data-testid="science-scene">
      <button type="button" data-testid="science-model-ph-lab" onClick={() => props.onZoneSelect("ph-lab")}>Select pH Lab</button>
      <button type="button" onClick={props.onContextLost}>Simulate Science graphics loss</button>
    </div>;
  } };
});

vi.mock("@react-three/fiber", () => ({
  Canvas: ({ children, fallback }: { children: React.ReactNode; fallback: React.ReactNode }) => {
    rendererState.canvasRenders++;
    if (rendererState.canvasFallback) { rendererState.fallbackRenders++; return <><span data-testid="mock-canvas-internal-fallback" />{fallback}</>; }
    return <div data-testid="mock-science-canvas">{children}</div>;
  },
  useFrame: () => undefined,
  useThree: () => ({
    gl: { domElement: rendererState.domElement ?? (rendererState.domElement = document.createElement("canvas")) },
    camera: { position: { y: 0 }, lookAt: vi.fn() },
  }),
}));

function expectCompleteScienceFallback() {
  expect(screen.getByRole("img", { name: "Science Planet map" })).toBeTruthy();
  expect(screen.getByRole("button", { name: "Back to Worlds" })).toBeTruthy();
  expect(screen.getByRole("button", { name: "Start Magnet Lab" })).toBeTruthy();
  ["Magnet Lab", "Sink & Float Bay", "pH Lab", "Animal Arena", "Colors Canyon", "Life Cycle Garden"].forEach((name) => {
    expect(screen.getByRole("button", { name: `Visit ${name}` })).toBeTruthy();
  });
}

beforeEach(() => {
  webgl.supported = true;
  webgl.probeCalls = 0;
  sceneState.throwOnRender = false;
  sceneState.useActualScene = false;
  rendererState.canvasFallback = false;
  rendererState.canvasRenders = 0;
  rendererState.fallbackRenders = 0;
  rendererState.domElement = document.createElement("canvas");
  Object.defineProperty(window, "matchMedia", { writable: true, value: vi.fn().mockReturnValue({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }) });
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(() => {
    webgl.probeCalls++;
    return webgl.supported ? { getExtension: () => null } as never : null;
  });
});

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

it("uses a named Science region below the page-level main landmark with Canvas enabled", async () => {
  render(<main><SciencePlanetCanvas selectedZone="magnet-lab" onZoneSelect={vi.fn()} onBackToWorlds={vi.fn()} onStartMagnetLab={vi.fn()} /></main>);

  await screen.findByTestId("science-model-ph-lab");
  expect(screen.getAllByRole("main")).toHaveLength(1);
  expect(screen.getByRole("region", { name: "Science Planet" }).tagName).toBe("SECTION");
});

it("uses the same selected-zone callback in the 3D scene and fallback", async () => {
  const onZoneSelect = vi.fn();
  render(<SciencePlanetCanvas selectedZone="magnet-lab" onZoneSelect={onZoneSelect} onBackToWorlds={vi.fn()} onStartMagnetLab={vi.fn()} />);

  fireEvent.click(await screen.findByTestId("science-model-ph-lab"));
  expect(onZoneSelect).toHaveBeenCalledWith("ph-lab");
});

it("shows a working fallback after graphics failure", async () => {
  const onZoneSelect = vi.fn();
  const back = vi.fn();
  const start = vi.fn();
  render(<SciencePlanetCanvas selectedZone="magnet-lab" onZoneSelect={onZoneSelect} onBackToWorlds={back} onStartMagnetLab={start} />);

  fireEvent.click(await screen.findByRole("button", { name: "Simulate Science graphics loss" }));
  expectCompleteScienceFallback();
  fireEvent.click(screen.getByRole("button", { name: "Start Magnet Lab" }));
  expect(start).toHaveBeenCalledOnce();
  fireEvent.click(screen.getByRole("button", { name: "Back to Worlds" }));
  expect(back).toHaveBeenCalledOnce();
  fireEvent.click(screen.getByRole("button", { name: "Visit pH Lab" }));
  expect(onZoneSelect).toHaveBeenCalledWith("ph-lab");
});

it("uses the complete Science map when WebGL is unsupported or explicitly disabled", async () => {
  webgl.supported = false;
  const unsupported = render(<SciencePlanetCanvas selectedZone="magnet-lab" onZoneSelect={vi.fn()} onBackToWorlds={vi.fn()} onStartMagnetLab={vi.fn()} />);
  await waitFor(() => expect(webgl.probeCalls).toBe(1));
  expectCompleteScienceFallback();
  unsupported.unmount();

  webgl.probeCalls = 0;
  render(<SciencePlanetCanvas quality="fallback" selectedZone="magnet-lab" onZoneSelect={vi.fn()} onBackToWorlds={vi.fn()} onStartMagnetLab={vi.fn()} />);
  await act(async () => {});
  expect(webgl.probeCalls).toBe(0);
  expectCompleteScienceFallback();
});

it("uses the complete map after a scene boundary error", async () => {
  sceneState.throwOnRender = true;
  const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
  render(<SciencePlanetCanvas selectedZone="magnet-lab" onZoneSelect={vi.fn()} onBackToWorlds={vi.fn()} onStartMagnetLab={vi.fn()} />);

  await waitFor(expectCompleteScienceFallback);
  expect(screen.queryByTestId("science-scene")).toBeNull();
  consoleError.mockRestore();
});

it("turns an actual WebGL context loss into a complete, usable Science map", async () => {
  sceneState.useActualScene = true;
  const onZoneSelect = vi.fn();
  const start = vi.fn();
  render(<SciencePlanetCanvas selectedZone="magnet-lab" onZoneSelect={onZoneSelect} onBackToWorlds={vi.fn()} onStartMagnetLab={start} />);
  await screen.findByTestId("mock-science-canvas");
  await waitFor(() => expect(rendererState.domElement?.getAttribute("aria-hidden")).toBe("true"));
  const loss = new Event("webglcontextlost", { cancelable: true });
  rendererState.domElement?.dispatchEvent(loss);

  await waitFor(expectCompleteScienceFallback);
  expect(loss.defaultPrevented).toBe(true);
  expect(screen.queryByTestId("mock-science-canvas")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Start Magnet Lab" }));
  expect(start).toHaveBeenCalledOnce();
  fireEvent.click(screen.getByRole("button", { name: "Visit pH Lab" }));
  expect(onZoneSelect).toHaveBeenCalledWith("ph-lab");
});

it("turns the Canvas internal fallback into a complete, usable Science map", async () => {
  sceneState.useActualScene = true;
  rendererState.canvasFallback = true;
  const onZoneSelect = vi.fn();
  const start = vi.fn();
  render(<SciencePlanetCanvas selectedZone="magnet-lab" onZoneSelect={onZoneSelect} onBackToWorlds={vi.fn()} onStartMagnetLab={start} />);

  await waitFor(() => expect(rendererState.fallbackRenders).toBeGreaterThan(0));
  await waitFor(expectCompleteScienceFallback);
  expect(screen.queryByTestId("mock-science-canvas")).toBeNull();
  expect(screen.queryByTestId("mock-canvas-internal-fallback")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Start Magnet Lab" }));
  expect(start).toHaveBeenCalledOnce();
  fireEvent.click(screen.getByRole("button", { name: "Visit pH Lab" }));
  expect(onZoneSelect).toHaveBeenCalledWith("ph-lab");
});

it("reduces only decoration density on low quality", () => {
  expect(scienceDecorationCounts("low").clouds).toBeLessThan(scienceDecorationCounts("high").clouds);
  expect(scienceDecorationCounts("low").stars).toBeLessThan(scienceDecorationCounts("high").stars);
  expect(scienceDecorationCounts("low").magneticFragments).toBeLessThan(scienceDecorationCounts("high").magneticFragments);
});

it("defaults to motion when matchMedia is unavailable", async () => {
  Object.defineProperty(window, "matchMedia", { configurable: true, writable: true, value: undefined });

  render(<SciencePlanetCanvas selectedZone="magnet-lab" onZoneSelect={vi.fn()} onBackToWorlds={vi.fn()} onStartMagnetLab={vi.fn()} />);

  expect((await screen.findByRole("region", { name: "Science Planet" })).getAttribute("data-reduced-motion")).toBe("false");
});
