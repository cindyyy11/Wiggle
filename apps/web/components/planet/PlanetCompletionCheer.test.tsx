// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { PlanetCompletionCheer } from "./PlanetCompletionCheer";

beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { cleanup(); vi.useRealTimers(); });

it("shows the title, body, and Keep exploring control", () => {
  render(<PlanetCompletionCheer title="You did it!" body="All four Science lands explored — you're a Science explorer!" onDismiss={vi.fn()} />);
  expect(screen.getByRole("dialog", { name: "You did it!" })).toBeTruthy();
  expect(screen.getByText("All four Science lands explored — you're a Science explorer!")).toBeTruthy();
  expect(screen.getByRole("button", { name: "Keep exploring" })).toBeTruthy();
});

it("dismisses on the button and on Escape", () => {
  const onDismiss = vi.fn();
  const { unmount } = render(<PlanetCompletionCheer title="You did it!" body="Body" onDismiss={onDismiss} />);
  fireEvent.click(screen.getByRole("button", { name: "Keep exploring" }));
  expect(onDismiss).toHaveBeenCalledTimes(1);
  unmount();
  onDismiss.mockClear();
  render(<PlanetCompletionCheer title="You did it!" body="Body" onDismiss={onDismiss} />);
  fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
  expect(onDismiss).toHaveBeenCalledTimes(1);
});

it("auto-dismisses after autoDismissMs", () => {
  const onDismiss = vi.fn();
  render(<PlanetCompletionCheer title="You did it!" body="Body" onDismiss={onDismiss} autoDismissMs={4000} />);
  act(() => { vi.advanceTimersByTime(3999); });
  expect(onDismiss).not.toHaveBeenCalled();
  act(() => { vi.advanceTimersByTime(1); });
  expect(onDismiss).toHaveBeenCalledTimes(1);
});
