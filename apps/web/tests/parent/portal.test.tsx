// @vitest-environment jsdom
import React from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { ParentPortal } from "../../components/parent/ParentPortal";
import { parentRequest } from "../../lib/api/parent";

vi.mock("../../lib/api/parent", () => ({ parentRequest: vi.fn() }));
vi.mock("../../components/parent/ParentDashboard", () => ({ ParentDashboard: ({ mode }: { mode: string }) => <h2>Progress mode: {mode}</h2> }));
afterEach(() => { cleanup(); vi.useRealTimers(); vi.clearAllMocks(); });

it("verifies the existing PIN after first-time setup and automatic locking", async () => {
  vi.useFakeTimers();
  vi.mocked(parentRequest).mockImplementation(async path => path === "pin/status" ? { setupRequired: true, dataMode: "memory_demo" } : { unlocked: true });
  await act(async () => { render(<ParentPortal />); });
  fireEvent.change(screen.getByLabelText("Parent PIN"), { target: { value: "654321" } });
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Set PIN and enter" })); });
  expect(parentRequest).toHaveBeenCalledWith("pin/setup", { pin: "654321" });
  expect(screen.getByRole("heading", { name: /Progress mode:/ })).toBeTruthy();
  await act(async () => { await vi.advanceTimersByTimeAsync(15 * 60 * 1000); });
  expect(screen.queryByRole("heading", { name: /Progress mode:/ })).toBeNull();
  fireEvent.change(screen.getByLabelText("Parent PIN"), { target: { value: "654321" } });
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Enter mission control" })); });
  expect(parentRequest).toHaveBeenCalledWith("pin/verify", { pin: "654321" });
  expect(screen.getByText("Progress mode: memory_demo")).toBeTruthy();
});

it("labels an upstream memory repository as a demo without advertising a public PIN", async () => {
  vi.mocked(parentRequest).mockResolvedValue({ setupRequired: false, dataMode: "memory_demo" });
  await act(async () => { render(<ParentPortal />); });
  expect(screen.getByText(/Connected demo/)).toBeTruthy();
  expect(screen.queryByText("123456")).toBeNull();
});

it("does not infer household persistence when the backend omits its data mode", async () => {
  vi.mocked(parentRequest).mockResolvedValue({ setupRequired: false });
  await act(async () => { render(<ParentPortal />); });
  expect(screen.getByRole("alert")).toBeTruthy();
  expect(screen.queryByLabelText("Parent PIN")).toBeNull();
});
