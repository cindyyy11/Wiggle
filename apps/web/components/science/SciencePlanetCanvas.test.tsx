// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { SciencePlanetCanvas, scienceDecorationCounts } from "./SciencePlanetCanvas";

vi.mock("next/dynamic", () => ({
  default: () => function Scene(props: { onZoneSelect: (zone: "ph-lab") => void; onContextLost: () => void }) {
    return <div data-testid="science-scene">
      <button type="button" data-testid="science-model-ph-lab" onClick={() => props.onZoneSelect("ph-lab")}>Select pH Lab</button>
      <button type="button" onClick={props.onContextLost}>Simulate Science graphics loss</button>
    </div>;
  },
}));

beforeEach(() => {
  Object.defineProperty(window, "matchMedia", { writable: true, value: vi.fn().mockReturnValue({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }) });
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({ getExtension: () => null } as never);
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
  expect(screen.getByRole("img", { name: "Science Planet map" })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Start Magnet Lab" }));
  expect(start).toHaveBeenCalledOnce();
  fireEvent.click(screen.getByRole("button", { name: "Back to Worlds" }));
  expect(back).toHaveBeenCalledOnce();
  fireEvent.click(screen.getByRole("button", { name: "Visit pH Lab" }));
  expect(onZoneSelect).toHaveBeenCalledWith("ph-lab");
});

it("reduces only decoration density on low quality", () => {
  expect(scienceDecorationCounts("low").clouds).toBeLessThan(scienceDecorationCounts("high").clouds);
  expect(scienceDecorationCounts("low").stars).toBeLessThan(scienceDecorationCounts("high").stars);
  expect(scienceDecorationCounts("low").magneticFragments).toBeLessThan(scienceDecorationCounts("high").magneticFragments);
});
