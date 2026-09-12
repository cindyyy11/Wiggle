// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { ScienceFallback } from "./ScienceFallback";
import { SCIENCE_ZONES } from "./scienceWorld";

afterEach(cleanup);

it("keeps all six topic and map actions available in the fallback", () => {
  const onZoneSelect = vi.fn();
  const onStartMagnetLab = vi.fn();
  render(
    <ScienceFallback
      selectedZone="magnet-lab"
      onZoneSelect={onZoneSelect}
      onBackToWorlds={vi.fn()}
      onStartMagnetLab={onStartMagnetLab}
    />,
  );

  expect(screen.getByRole("img", { name: "Science Planet map" })).toBeTruthy();
  expect(screen.getAllByRole("button", { name: /^Visit / })).toHaveLength(SCIENCE_ZONES.length);
  expect(screen.getAllByRole("button", { name: /^Map point: / })).toHaveLength(SCIENCE_ZONES.length);
  SCIENCE_ZONES.forEach((zone) => fireEvent.click(screen.getByRole("button", { name: `Visit ${zone.name}` })));
  SCIENCE_ZONES.forEach((zone) => fireEvent.click(screen.getByRole("button", { name: `Map point: ${zone.name}` })));
  expect(onZoneSelect.mock.calls.map(([zone]) => zone)).toEqual([
    ...SCIENCE_ZONES.map((zone) => zone.id),
    ...SCIENCE_ZONES.map((zone) => zone.id),
  ]);
  expect(screen.getByRole("button", { name: "Start Magnet Lab" })).toBeTruthy();
});

it("shows a truthful future-zone card without a start action", () => {
  const callbacks = {
    onZoneSelect: vi.fn(),
    onBackToWorlds: vi.fn(),
    onStartMagnetLab: vi.fn(),
  };
  render(<ScienceFallback selectedZone="animals" {...callbacks} />);

  expect(screen.getByText("Coming soon")).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Start Magnet Lab" })).toBeNull();
});

it("shows local Magnet Lab completion feedback in the visible selected-zone card", () => {
  render(<ScienceFallback
    selectedZone="magnet-lab"
    onZoneSelect={vi.fn()}
    onBackToWorlds={vi.fn()}
    onStartMagnetLab={vi.fn()}
    completionMessage="Magnet Lab discovery complete."
  />);

  expect(screen.getByRole("status").textContent).toBe("Magnet Lab discovery complete.");
});
