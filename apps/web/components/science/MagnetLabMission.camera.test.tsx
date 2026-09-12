// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { MagnetLabMission } from "./MagnetLabMission";

// Keep the real tracking hook: this verifies the mission-to-browser camera contract.
vi.mock("./MagnetHandLabScene", () => ({ MagnetHandLabScene: () => null }));

const originalMediaDevices = Object.getOwnPropertyDescriptor(navigator, "mediaDevices");
afterEach(() => {
  cleanup();
  if (originalMediaDevices) Object.defineProperty(navigator, "mediaDevices", originalMediaDevices);
  else Reflect.deleteProperty(navigator, "mediaDevices");
  vi.unstubAllGlobals();
});

it("requests the camera once automatically and once more when the child retries", async () => {
  const getUserMedia = vi.fn().mockRejectedValue(new DOMException("Camera permission denied", "NotAllowedError"));
  Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: { getUserMedia } });
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
  const onExit = vi.fn();
  const onComplete = vi.fn();
  const { container, rerender } = render(<MagnetLabMission onExit={onExit} onComplete={onComplete} />);
  const video = container.querySelector("video");

  await screen.findByRole("heading", { name: "Ask an adult to turn on the camera" });
  expect(video).toBeTruthy();
  expect(getUserMedia).toHaveBeenCalledTimes(1);
  expect(getUserMedia).toHaveBeenCalledWith(expect.objectContaining({ audio: false, video: expect.any(Object) }));
  rerender(<MagnetLabMission onExit={onExit} onComplete={onComplete} />);
  expect(getUserMedia).toHaveBeenCalledTimes(1);
  expect(container.querySelector("video")).toBe(video);

  fireEvent.click(screen.getByRole("button", { name: "Try again" }));
  await waitFor(() => expect(getUserMedia).toHaveBeenCalledTimes(2));
  await screen.findByRole("heading", { name: "Ask an adult to turn on the camera" });
  expect(container.querySelector("video")).toBe(video);
  expect(screen.queryByRole("button", { name: /Use hand gestures|Try the magnet/i })).toBeNull();
  expect(onComplete).not.toHaveBeenCalled();
});
