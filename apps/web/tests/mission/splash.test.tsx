// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
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

it("shows the splash automatically, then reveals the atlas without any action", () => {
  vi.useFakeTimers();
  render(<MissionAtlas quality="fallback" />);

  expect(screen.getByRole("region", { name: "Welcome to Wiggle" })).toBeTruthy();
  act(() => vi.advanceTimersByTime(900 + 320));

  expect(screen.getAllByRole("button", { name: "Start fractions mission" })).toHaveLength(1);
  expect(screen.queryByRole("region", { name: "Welcome to Wiggle" })).toBeNull();
});

it("keeps Numeria unavailable behind the splash until it auto-dismisses", () => {
  render(<MissionAtlas quality="fallback" />);

  expect(screen.getByRole("region", { name: "Welcome to Wiggle" })).toBeTruthy();
  expect(screen.queryByRole("region", { name: "Explore Numeria" })).toBeNull();
  expect(document.querySelector('[aria-label="Explore Numeria"]')?.parentElement?.hasAttribute("inert")).toBe(true);
});

it("skips the internal splash only when the shell requests it", () => {
  render(<MissionAtlas quality="fallback" showSplash={false} />);

  expect(screen.queryByRole("region", { name: "Welcome to Wiggle" })).toBeNull();
  expect(screen.getByRole("region", { name: "Explore Numeria" })).toBeTruthy();
});
