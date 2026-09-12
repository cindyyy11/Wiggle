// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { ScienceFallback } from "./ScienceFallback";

afterEach(cleanup);

it("keeps all six topic actions available in the fallback", () => {
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
  fireEvent.click(screen.getByRole("button", { name: "Visit Sink & Float Bay" }));
  expect(onZoneSelect).toHaveBeenCalledWith("sink-float");
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
