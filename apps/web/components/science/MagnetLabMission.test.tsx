// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { MagnetLabMission } from "./MagnetLabMission";

afterEach(cleanup);

function completeObject(name: string, answer: "Attracted" | "Not attracted") {
  fireEvent.click(screen.getByRole("button", { name: `Test ${name}` }));
  fireEvent.click(screen.getByRole("button", { name: "Try the magnet" }));
  fireEvent.click(screen.getByRole("button", { name: answer }));
}

it("requires observation before a classification can progress", () => {
  render(<MagnetLabMission onExit={vi.fn()} onComplete={vi.fn()} />);

  fireEvent.click(screen.getByRole("button", { name: "Test paper clip" }));
  fireEvent.click(screen.getByRole("button", { name: "Attracted" }));

  expect(screen.getByText("0 of 4 discoveries")).toBeTruthy();
  expect(screen.getByRole("status").textContent).toContain("Try the magnet first to observe what happens.");
});

it("uses one polite announcement for an observed result", () => {
  render(<MagnetLabMission onExit={vi.fn()} onComplete={vi.fn()} />);

  fireEvent.click(screen.getByRole("button", { name: "Test paper clip" }));
  fireEvent.click(screen.getByRole("button", { name: "Try the magnet" }));

  expect(screen.getByText("Observation: The paper clip moves toward the magnet.").getAttribute("aria-live")).toBeNull();
  expect(screen.getByRole("status").textContent).toBe("The paper clip moves toward the magnet.");
});

it("does not advance after an incorrect classification and completes once after all correct results", () => {
  const onComplete = vi.fn();
  render(<MagnetLabMission onExit={vi.fn()} onComplete={onComplete} />);

  fireEvent.click(screen.getByRole("button", { name: "Test paper clip" }));
  fireEvent.click(screen.getByRole("button", { name: "Try the magnet" }));
  fireEvent.click(screen.getByRole("button", { name: "Not attracted" }));
  expect(screen.getByRole("alert").textContent).toContain("Try that object with the magnet again.");
  expect(screen.getByText("0 of 4 discoveries")).toBeTruthy();

  fireEvent.click(screen.getByRole("button", { name: "Try the magnet" }));
  fireEvent.click(screen.getByRole("button", { name: "Attracted" }));
  completeObject("iron nail", "Attracted");
  completeObject("wooden block", "Not attracted");
  completeObject("plastic button", "Not attracted");

  expect(screen.getByText("4 of 4 discoveries")).toBeTruthy();
  expect(screen.getByText("Magnet Lab complete")).toBeTruthy();
  expect(onComplete).toHaveBeenCalledTimes(1);

  fireEvent.click(screen.getByRole("button", { name: "Test paper clip" }));
  fireEvent.click(screen.getByRole("button", { name: "Try the magnet" }));
  fireEvent.click(screen.getByRole("button", { name: "Attracted" }));
  expect(onComplete).toHaveBeenCalledTimes(1);
});

it("has a labelled mission region and an exit button that calls only onExit", () => {
  const onExit = vi.fn();
  const onComplete = vi.fn();
  render(<MagnetLabMission onExit={onExit} onComplete={onComplete} />);

  expect(screen.getByRole("region", { name: "Magnet Lab mission" })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Exit Magnet Lab" }));
  expect(onExit).toHaveBeenCalledTimes(1);
  expect(onComplete).not.toHaveBeenCalled();
});
