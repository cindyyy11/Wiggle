// @vitest-environment jsdom
import React from "react";
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { QuickCheckIn } from "../../components/parent/QuickCheckIn";

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

it("submits Smooth immediately with no difficulty prompt and no note", async () => {
  const submit = vi.fn().mockResolvedValue({ message: "Thanks for sharing." });
  render(<QuickCheckIn childId="child-1" submit={submit} />);
  fireEvent.click(screen.getByRole("button", { name: "Smooth" }));
  await screen.findByText("Thanks for sharing.");
  expect(submit).toHaveBeenCalledWith({ childId: "child-1", difficulty: .15, note: "" }, expect.any(String));
  expect(screen.queryByText("What seemed hardest? (optional)")).toBeNull();
});

it("offers a hardest-part follow-up after Needed support or Difficult, and includes it in the note", async () => {
  const submit = vi.fn().mockResolvedValue({ message: "Thanks for sharing." });
  render(<QuickCheckIn childId="child-1" submit={submit} />);
  fireEvent.click(screen.getByRole("button", { name: "Difficult" }));
  await screen.findByText("What seemed hardest? (optional)");
  fireEvent.click(screen.getByRole("button", { name: "Understanding" }));
  await screen.findByText("Thanks for sharing.");
  expect(submit).toHaveBeenLastCalledWith(
    { childId: "child-1", difficulty: .85, note: "Hardest part: Understanding" },
    expect.any(String),
  );
});

it("shows an error and lets the parent retry with a fresh key", async () => {
  const submit = vi.fn().mockRejectedValueOnce(new Error("Please try again.")).mockResolvedValue({ message: "Thanks for sharing." });
  render(<QuickCheckIn childId="child-1" submit={submit} />);
  fireEvent.click(screen.getByRole("button", { name: "Smooth" }));
  await screen.findByRole("alert");
  fireEvent.click(screen.getByRole("button", { name: "Smooth" }));
  await screen.findByText("Thanks for sharing.");
  expect(submit.mock.calls[0][1]).toBe(submit.mock.calls[1][1]);
});
