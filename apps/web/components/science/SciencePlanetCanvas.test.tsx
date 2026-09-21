// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { SciencePlanetCanvas } from "./SciencePlanetCanvas";
import { scienceLand } from "./scienceLands";
const state = vi.hoisted(() => ({ props: {} as Record<string, unknown> }));
vi.mock("../universe/UniverseCanvas", () => ({ UniverseCanvas: (props: { hud: React.ReactNode }) => { state.props = props; return <section aria-label="Science Planet">{props.hud}</section>; } }));
afterEach(cleanup);
const defaults = { selectedZone: "magnet-lab" as const, onZoneSelect: vi.fn(), onBackToWorlds: vi.fn(), onStartMagnetLab: vi.fn() };
it("reuses Numeria's renderer with the science theme and globe camera", () => {
  render(<SciencePlanetCanvas {...defaults} />);
  expect(state.props.theme).toBe("science");
  expect(state.props.mode).toBe("globe");
  expect(state.props.sceneContent).toBeTruthy();
  expect(screen.queryByRole("img", { name: "Science Planet map" })).toBeNull();
});
it("checkpoint selection sets a spherical walking destination and follows the explorer", () => {
  const select = vi.fn();
  render(<SciencePlanetCanvas {...defaults} onZoneSelect={select} />);
  fireEvent.click(screen.getByRole("button", { name: "Visit Animal Types" }));
  expect(select).toHaveBeenCalledWith("animals");
  expect(state.props.destination).toEqual(scienceLand("animals").destination);
  expect(state.props.mode).toBe("follow");
  fireEvent.click(screen.getByRole("button", { name: "View whole planet" }));
  expect(state.props.mode).toBe("globe");
});
it("preserves mission and back controls, including explicit graphics fallback", async () => {
  const start = vi.fn(); const back = vi.fn();
  render(<SciencePlanetCanvas {...defaults} quality="fallback" onStartMagnetLab={start} onBackToWorlds={back} />);
  expect(state.props.quality).toBe("fallback");
  fireEvent.click(screen.getByRole("button", { name: "Explore Magnet Lands" }));
  expect(screen.queryByRole('dialog')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: /Let’s explore/ }));
  fireEvent.click(screen.getByRole("button", { name: "Back to Science Planet" }));
  await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("button", { name: "Explore Magnet Lands" })));
  fireEvent.click(screen.getByRole("button", { name: "Back to Worlds" }));
  expect(start).toHaveBeenCalledOnce(); expect(back).toHaveBeenCalledOnce();
});

it('requires an invitation, ignores repeated B, and restores the entry position on Escape', () => {
  render(<SciencePlanetCanvas {...defaults} quality="fallback" />);
  fireEvent.keyDown(window, { key: 'b' });
  expect(screen.queryByRole('dialog')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Explore Magnet Lands' }));
  fireEvent.keyDown(window, { key: 'b', repeat: true });
  expect(screen.queryByRole('dialog')).toBeNull();
  const input = state.props.explorerInput as { current: { position: [number, number, number]; teleport: unknown } };
  input.current.position = [0, 0, 3];
  fireEvent.keyDown(window, { key: 'B' });
  expect(screen.getByRole('dialog', { name: 'Magnet Lands activity session' })).toBeTruthy();
  fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(input.current.teleport).toEqual({ latitude: 0, longitude: 0 });
});

it('dismisses an invitation and opens a subject-specific starter through touch', () => {
  render(<SciencePlanetCanvas {...defaults} quality="fallback" />);
  fireEvent.click(screen.getByRole('button', { name: 'Visit Animal Types' }));
  fireEvent.click(screen.getByRole('button', { name: 'Not now' }));
  fireEvent.keyDown(window, { key: 'b' });
  expect(screen.queryByRole('dialog')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Explore Animal Types' }));
  fireEvent.click(screen.getByRole('button', { name: /Let’s explore/ }));
  expect(screen.getByRole('dialog', { name: 'Animal Types activity session' })).toBeTruthy();
  expect(screen.getByRole('region', { name: 'Animal Types activity' })).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Discover Frog' })).toBeNull();
  expect(screen.queryByRole('button', { name: 'Test steel coin' })).toBeNull();
});

it('exposes the Animal Types starter as a dialog and closes it on Escape', () => {
  render(<SciencePlanetCanvas {...defaults} quality="fallback" />);
  fireEvent.click(screen.getByRole('button', { name: 'Visit Animal Types' }));
  fireEvent.click(screen.getByRole('button', { name: 'Explore Animal Types' }));
  fireEvent.click(screen.getByRole('button', { name: /Let’s explore/ }));
  expect(screen.getByRole('dialog', { name: 'Animal Types activity session' })).toBeTruthy();
  fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
  expect(screen.queryByRole('dialog')).toBeNull();
});
