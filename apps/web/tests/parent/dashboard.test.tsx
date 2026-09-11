// @vitest-environment jsdom
import React from "react";
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ParentPinGate } from "../../components/parent/ParentPinGate";
import { HomeworkCheckIn } from "../../components/parent/HomeworkCheckIn";

afterEach(() => { cleanup(); vi.restoreAllMocks(); });
it("does not render private content before verification and reports lockout", async () => {
  const verify = vi.fn().mockRejectedValue(new Error("Too many attempts. Try again in 5 minutes."));
  render(<ParentPinGate verify={verify}><h2>Private progress</h2></ParentPinGate>);
  expect(screen.queryByText("Private progress")).toBeNull();
  fireEvent.change(screen.getByLabelText("Parent PIN"), { target: { value: "000000" } });
  fireEvent.click(screen.getByRole("button", { name: "Enter mission control" }));
  expect(await screen.findByRole("alert")).toBeTruthy();
  expect(screen.queryByText("Private progress")).toBeNull();
});
it("opens after the server accepts the PIN", async () => {
  render(<ParentPinGate verify={vi.fn().mockResolvedValue(undefined)}><h2>Private progress</h2></ParentPinGate>);
  fireEvent.change(screen.getByLabelText("Parent PIN"), { target: { value: "123456" } });
  fireEvent.click(screen.getByRole("button", { name: "Enter mission control" }));
  expect(await screen.findByText("Private progress")).toBeTruthy();
});
it("submits check-ins as context with a stable retry key and no twin fields", async () => {
  const submit = vi.fn().mockRejectedValueOnce(new Error("Try again")).mockResolvedValue({ message: "Thanks for sharing." });
  render(<HomeworkCheckIn childId="child" submit={submit} />);
  fireEvent.change(screen.getByLabelText("Anything helpful to know?"), { target: { value: "Tired after school" } });
  fireEvent.click(screen.getByRole("button", { name: "Share check-in" }));
  await screen.findByRole("alert");
  fireEvent.click(screen.getByRole("button", { name: "Share check-in" }));
  await screen.findByText("Thanks for sharing.");
  expect(submit.mock.calls[0]).toEqual(submit.mock.calls[1]);
  expect(submit.mock.calls[0][0]).toEqual({ childId: "child", difficulty: .5, note: "Tired after school" });
});
