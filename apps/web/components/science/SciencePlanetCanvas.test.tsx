// @vitest-environment jsdom
import React from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { SciencePlanetCanvas, scienceDecorationCounts } from "./SciencePlanetCanvas";
import SciencePlanetScene from "./SciencePlanetScene";

const webgl = vi.hoisted(() => ({ supported: true, probeCalls: 0 }));
const sceneState = vi.hoisted(() => ({ throwOnRender: false }));
const rendererState = vi.hoisted(() => ({ canvasFallback: false, domElement: null as HTMLCanvasElement | null }));

vi.mock("next/dynamic", () => ({
  default: () => function Scene(props: { onZoneSelect: (zone: "ph-lab") => void; onContextLost: () => void }) {
    if (sceneState.throwOnRender) throw new Error("Science scene failed to render");
    return <div data-testid="science-scene">
      <button type="button" data-testid="science-model-ph-lab" onClick={() => props.onZoneSelect("ph-lab")}>Select pH Lab</button>
      <button type="button" onClick={props.onContextLost}>Simulate Science graphics loss</button>
    </div>;
  },
}));

vi.mock("@react-three/fiber", () => ({
  Canvas: ({ children, fallback }: { children: React.ReactNode; fallback: React.ReactNode }) => rendererState.canvasFallback ? <>{fallback}</> : <div data-testid="mock-science-canvas">{children}</div>,
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

function sceneProps(onContextLost = vi.fn()) {
  return {
    quality: "high" as const,
    reducedMotion: false,
    selectedZone: "magnet-lab" as const,
    onZoneSelect: vi.fn(),
    onContextLost,
    onQualityChange: vi.fn(),
    counts: { clouds: 3, stars: 36, magneticFragments: 5 },
  };
}

beforeEach(() => {
  webgl.supported = true;
  webgl.probeCalls = 0;
  sceneState.throwOnRender = false;
  rendererState.canvasFallback = false;
  rendererState.domElement = document.createElement("canvas");
  Object.defineProperty(window, "matchMedia", { writable: true, value: vi.fn().mockReturnValue({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }) });
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(() => {
    webgl.probeCalls++;
    return webgl.supported ? { getExtension: () => null } as never : null;
  });
});

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

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

it("listens for an actual WebGL context loss and prevents its default", async () => {
  const onContextLost = vi.fn();
  render(<SciencePlanetScene {...sceneProps(onContextLost)} />);
  const loss = new Event("webglcontextlost", { cancelable: true });
  rendererState.domElement?.dispatchEvent(loss);

  await waitFor(() => expect(onContextLost).toHaveBeenCalledOnce());
  expect(loss.defaultPrevented).toBe(true);
});

it("reports the Canvas internal fallback once so the outer boundary can show the complete map", async () => {
  rendererState.canvasFallback = true;
  const onContextLost = vi.fn();
  render(<SciencePlanetScene {...sceneProps(onContextLost)} />);

  await waitFor(() => expect(onContextLost).toHaveBeenCalledOnce());
  expect(screen.queryByText("Choose a discovery spot using the Science topic buttons.")).toBeNull();
});

it("reduces only decoration density on low quality", () => {
  expect(scienceDecorationCounts("low").clouds).toBeLessThan(scienceDecorationCounts("high").clouds);
  expect(scienceDecorationCounts("low").stars).toBeLessThan(scienceDecorationCounts("high").stars);
  expect(scienceDecorationCounts("low").magneticFragments).toBeLessThan(scienceDecorationCounts("high").magneticFragments);
});
