// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { ScienceHud } from "./ScienceHud";

afterEach(cleanup);

const base = {
  selectedZone: "animals" as const,
  onZoneSelect: vi.fn(),
  onBackToWorlds: vi.fn(),
  onStartMagnetLab: vi.fn(),
  onExplore: vi.fn(),
};

it("shows 0 of 4 lands complete with no badges", () => {
  render(<ScienceHud {...base} completedZones={new Set()} />);
  expect(screen.getByRole("status").textContent).toContain("0 of 4 lands complete");
  expect(screen.queryByText("Complete")).toBeNull();
});

it("badges completed lands and counts them", () => {
  render(<ScienceHud {...base} completedZones={new Set(["animals", "magnet-lab"])} />);
  expect(screen.getByRole("status").textContent).toContain("2 of 4 lands complete");
  const animals = screen.getByRole("button", { name: "Visit Animal Types" });
  expect(within(animals).getAllByText("Complete").length).toBeGreaterThan(0);
  const magnet = screen.getByRole("button", { name: "Visit Magnet Lands" });
  expect(within(magnet).getAllByText("Complete").length).toBeGreaterThan(0);
});
