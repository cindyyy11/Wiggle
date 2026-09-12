// @vitest-environment jsdom
import React from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { SubjectWorlds } from "../../components/worlds/SubjectWorlds";

afterEach(() => {
  vi.useRealTimers();
  cleanup();
  window.history.replaceState({}, "", "/");
});

function enterWorlds() {
  fireEvent.click(screen.getByRole("button", { name: "Let's Wiggle" }));
  act(() => vi.advanceTimersByTime(320));
}

it("keeps every Canvas action available through native labelled controls", () => {
  vi.useFakeTimers();
  render(<SubjectWorlds initialRoute={{ world: null }} quality="fallback" />);

  enterWorlds();
  expect(screen.getByRole("button", { name: "Explore Science Planet" })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Explore Science Planet" }));

  fireEvent.click(screen.getByRole("button", { name: "Visit Magnet Lab" }));
  fireEvent.click(screen.getByRole("button", { name: "Start Magnet Lab" }));
  expect(screen.getByRole("region", { name: "Magnet Lab mission" })).toBeTruthy();
});

it("announces locked worlds without moving focus away from the selector", () => {
  vi.useFakeTimers();
  render(<SubjectWorlds initialRoute={{ world: null }} quality="fallback" />);

  enterWorlds();
  for (const [buttonName, message] of [
    ["English (coming soon)", "English is coming soon"],
    ["Bahasa Melayu (coming soon)", "Bahasa Melayu is coming soon"],
  ]) {
    const locked = screen.getByRole("button", { name: buttonName });
    locked.focus();
    fireEvent.click(locked);

    expect(document.activeElement).toBe(locked);
    expect(screen.getAllByRole("status").some((status) => status.textContent?.includes(message))).toBe(true);
  }
});
