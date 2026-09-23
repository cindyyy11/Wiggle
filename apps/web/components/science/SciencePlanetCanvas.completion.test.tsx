// @vitest-environment jsdom
import React from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import type { StarterLand } from "./scienceActivities";

const hand = vi.hoisted(() => ({
  complete: null as ((land: StarterLand) => void) | null,
  close: null as (() => void) | null,
}));
const magnet = vi.hoisted(() => ({
  complete: null as (() => void) | null,
  exit: null as (() => void) | null,
}));

vi.mock("../universe/UniverseCanvas", () => ({
  UniverseCanvas: (props: { hud: React.ReactNode }) => <section aria-label="Science Planet">{props.hud}</section>,
}));
vi.mock("./MagnetLabMission", () => ({
  MagnetLabMission: (props: { onComplete(): void; onExit(): void }) => {
    magnet.complete = props.onComplete;
    magnet.exit = props.onExit;
    return <button type="button" onClick={props.onExit}>Back to Science Planet</button>;
  },
}));
vi.mock("./ScienceHandSession", () => ({
  ScienceHandSession: (props: { land: StarterLand; onComplete?(land: StarterLand): void; onClose(): void }) => {
    hand.complete = props.onComplete ?? null;
    hand.close = props.onClose;
    return <button type="button" onClick={props.onClose}>Back to Science Planet</button>;
  },
}));

import { SciencePlanetCanvas } from "./SciencePlanetCanvas";

afterEach(() => {
  cleanup();
  hand.complete = null;
  hand.close = null;
  magnet.complete = null;
  magnet.exit = null;
});

const defaults = { selectedZone: "magnet-lab" as const, onZoneSelect: vi.fn(), onBackToWorlds: vi.fn(), onStartMagnetLab: vi.fn() };

function openMagnet() {
  fireEvent.click(screen.getByRole("button", { name: "Explore Magnet Lands" }));
  fireEvent.click(screen.getByRole("button", { name: /Let’s explore/ }));
}

function openLand(visitLabel: string, exploreLabel: string) {
  fireEvent.click(screen.getByRole("button", { name: visitLabel }));
  fireEvent.click(screen.getByRole("button", { name: exploreLabel }));
  fireEvent.click(screen.getByRole("button", { name: /Let’s explore/ }));
}

async function finishMagnet() {
  openMagnet();
  act(() => { magnet.complete?.(); });
  fireEvent.click(screen.getByRole("button", { name: "Back to Science Planet" }));
  await waitFor(() => expect(screen.queryByRole("dialog", { name: "Magnet Lands activity session" })).toBeNull());
}

async function finishLand(visit: string, explore: string, id: StarterLand) {
  openLand(visit, explore);
  act(() => { hand.complete?.(id); });
  fireEvent.click(screen.getByRole("button", { name: "Back to Science Planet" }));
  await waitFor(() => expect(screen.queryByRole("dialog", { name: /activity session/ })).toBeNull());
}

it("marks Magnet Lab complete and shows 1 of 4 without cheering", async () => {
  render(<SciencePlanetCanvas {...defaults} quality="fallback" />);
  await finishMagnet();
  expect(screen.getByText("1 of 4 lands complete")).toBeTruthy();
  expect(screen.getByText("Wonderful exploring! Magnet Lands complete.")).toBeTruthy();
  expect(screen.queryByRole("dialog", { name: "You did it!" })).toBeNull();
});

it("cheers once after the fourth land finishes and the session closes", async () => {
  render(<SciencePlanetCanvas {...defaults} quality="fallback" />);
  await finishMagnet();

  const lands: Array<{ visit: string; explore: string; id: StarterLand }> = [
    { visit: "Visit Animal Types", explore: "Explore Animal Types", id: "animals" },
    { visit: "Visit Colors Canyon", explore: "Explore Colors Canyon", id: "colors" },
    { visit: "Visit Life Cycle Garden", explore: "Explore Life Cycle Garden", id: "life-cycle" },
  ];
  for (const land of lands) {
    await finishLand(land.visit, land.explore, land.id);
  }

  await waitFor(() => expect(screen.getByRole("dialog", { name: "You did it!" })).toBeTruthy());
  expect(screen.getByText("All four Science lands explored — you're a Science explorer!")).toBeTruthy();
  expect(screen.getByText("4 of 4 lands complete")).toBeTruthy();

  fireEvent.click(screen.getByRole("button", { name: "Keep exploring" }));
  expect(screen.queryByRole("dialog", { name: "You did it!" })).toBeNull();

  fireEvent.click(screen.getByRole("button", { name: "Visit Magnet Lands" }));
  openMagnet();
  fireEvent.click(screen.getByRole("button", { name: "Back to Science Planet" }));
  expect(screen.queryByRole("dialog", { name: "You did it!" })).toBeNull();
});
