// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MathActivitySession } from "./MathActivitySession";
import { MATH_ACTIVITIES, type MathRegionId } from "./mathActivities";

const MATH_REGION_IDS = Object.keys(MATH_ACTIVITIES) as MathRegionId[];

afterEach(cleanup);

describe("MathActivitySession", () => {
  it.each(MATH_REGION_IDS)("completes %s after three correct answers", (region) => {
    const complete = vi.fn();
    const close = vi.fn();
    const activity = MATH_ACTIVITIES[region];

    render(<MathActivitySession region={region} onComplete={complete} onClose={close} />);

    const firstChallenge = activity.challenges[0];
    const wrongAnswer = firstChallenge.options.find((option) => option !== firstChallenge.answer);
    expect(wrongAnswer).toBeDefined();

    expect(screen.getByText("Challenge 1 of 3")).toBeTruthy();
    expect(screen.getByRole("radiogroup", { name: /answer choices/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Check answer" })).toHaveProperty("disabled", true);

    fireEvent.click(screen.getByRole("radio", { name: wrongAnswer }));
    expect(screen.getByRole("button", { name: "Check answer" })).toHaveProperty("disabled", false);
    fireEvent.click(screen.getByRole("button", { name: "Check answer" }));

    expect(screen.getByRole("alert").textContent).toContain(firstChallenge.hint);
    expect(screen.getByText("Challenge 1 of 3")).toBeTruthy();
    expect(screen.getByRole("radio", { name: wrongAnswer }).getAttribute("aria-checked")).toBe("false");
    expect(screen.getByRole("button", { name: "Check answer" })).toHaveProperty("disabled", true);

    activity.challenges.forEach((expectedChallenge, index) => {
      expect(screen.getByRole("heading", { name: expectedChallenge.prompt })).toBeTruthy();
      fireEvent.click(screen.getByRole("radio", { name: expectedChallenge.answer }));
      fireEvent.click(screen.getByRole("button", { name: "Check answer" }));

      if (index < activity.challenges.length - 1) {
        const nextChallenge = activity.challenges[index + 1];
        expect(screen.getByText(`Challenge ${index + 2} of ${activity.challenges.length}`)).toBeTruthy();
        expect(screen.getByRole("heading", { name: nextChallenge.prompt })).toBeTruthy();
      }
    });

    expect(complete).toHaveBeenCalledOnce();
    expect(complete).toHaveBeenCalledWith(region);
    expect(screen.getByRole("heading", { name: /wonderful exploring/i })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Check answer" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Back to Numeria" }));
    expect(close).toHaveBeenCalledOnce();
    expect(complete).toHaveBeenCalledOnce();
  });
});
