// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MissionAtlas } from "../../components/mission/MissionAtlas";

vi.mock("next/dynamic", () => ({ default: () => () => null }));

beforeEach(() => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});

afterEach(() => {
  vi.useRealTimers();
  cleanup();
});

it("requires one native Let’s Wiggle action before exposing the atlas", () => {
  vi.useFakeTimers();
  render(<MissionAtlas quality="fallback" />);

  const launch = screen.getByRole("button", { name: "Let's Wiggle" });
  expect(launch.tagName).toBe("BUTTON");
  fireEvent.click(launch);
  expect((launch as HTMLButtonElement).disabled).toBe(true);
  fireEvent.click(launch);
  act(() => vi.advanceTimersByTime(320));

  expect(screen.getAllByRole("button", { name: "Start fractions mission" })).toHaveLength(1);
  expect(screen.queryByRole("button", { name: "Let's Wiggle" })).toBeNull();
});

it("keeps Numeria unavailable and focuses the splash action until it is dismissed", () => {
  render(<MissionAtlas quality="fallback" />);

  const launch = screen.getByRole("button", { name: "Let's Wiggle" });
  expect(document.activeElement).toBe(launch);
  expect(screen.queryByRole("region", { name: "Explore Numeria" })).toBeNull();
  expect(document.querySelector('[aria-label="Explore Numeria"]')?.parentElement?.hasAttribute("inert")).toBe(true);
});

it("skips the internal splash only when the shell requests it", () => {
  render(<MissionAtlas quality="fallback" showSplash={false} />);

  expect(screen.queryByRole("button", { name: "Let's Wiggle" })).toBeNull();
  expect(screen.getByRole("region", { name: "Explore Numeria" })).toBeTruthy();
});
