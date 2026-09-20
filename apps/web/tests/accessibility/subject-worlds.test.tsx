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
  act(() => vi.advanceTimersByTime(900 + 320));
}

it("keeps all subject-orbit actions available through native controls when WebGL falls back", () => {
  vi.useFakeTimers();
  render(<SubjectWorlds initialRoute={{ world: null }} quality="fallback" />);

  enterWorlds();
  expect(screen.getByRole("button", { name: "Previous planet" })).toBeTruthy();
  expect(screen.getByRole("button", { name: "Next planet" })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Next planet" }));
  fireEvent.click(screen.getByRole("button", { name: "Explore Science Planet" }));

  fireEvent.click(screen.getByRole("button", { name: "Visit Magnet Lands" }));
  fireEvent.click(screen.getByRole("button", { name: /Let’s explore/ }));
  expect(screen.getByRole("region", { name: "Magnet Lab mission" })).toBeTruthy();
});

it("keeps coming-soon planets disabled and silent without moving focus away from the selector", () => {
  vi.useFakeTimers();
  render(<SubjectWorlds initialRoute={{ world: null }} quality="fallback" />);

  enterWorlds();
  fireEvent.click(screen.getByRole("button", { name: "Next planet" }));
  const next = screen.getByRole("button", { name: "Next planet" });
  next.focus();
  for (let step = 0; step < 2; step++) {
    fireEvent.click(screen.getByRole("button", { name: "Next planet" }));
    const locked = screen.getByRole("button", { name: "??? (coming soon)" }) as HTMLButtonElement;
    expect(locked.disabled).toBe(true);
    expect(locked.getAttribute("aria-describedby")).toBe("world-lock-status");
    fireEvent.click(locked);

    expect(screen.getByRole("region", { name: "Choose a subject world" })).toBeTruthy();
    expect(window.location.search).toBe("");
    expect(screen.getByRole("status").textContent).toBe("");
    if (step === 0) expect(document.activeElement).toBe(next);
  }
});
