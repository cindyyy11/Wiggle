// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ResetStation } from "./ResetStation";

afterEach(() => { cleanup(); vi.useRealTimers(); });

describe("ResetStation", () => {
  it("cycles through breathing guidance on its own", () => {
    vi.useFakeTimers();
    render(<ResetStation onComplete={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByRole("status").textContent).toBe("Breathe in slowly.");
    act(() => { vi.advanceTimersByTime(4000); });
    expect(screen.getByRole("status").textContent).toBe("Hold.");
    act(() => { vi.advanceTimersByTime(2000); });
    expect(screen.getByRole("status").textContent).toBe("Breathe out.");
    act(() => { vi.advanceTimersByTime(4000); });
    expect(screen.getByRole("status").textContent).toBe("Breathe in slowly.");
  });

  it("offers Quiet plus four ambient soundscapes, defaulting to Quiet", () => {
    render(<ResetStation onComplete={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Quiet" }).getAttribute("aria-pressed")).toBe("true");
    for (const label of ["Calm Space", "Forest", "Rain", "Soft Waves"]) {
      expect(screen.getByRole("button", { name: label }).getAttribute("aria-pressed")).toBe("false");
    }
  });

  it("switches the pressed ambient option without throwing", () => {
    render(<ResetStation onComplete={vi.fn()} onCancel={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Rain" }));
    expect(screen.getByRole("button", { name: "Rain" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("button", { name: "Quiet" }).getAttribute("aria-pressed")).toBe("false");
  });

  it("keeps the original completion and cancel actions", () => {
    const onComplete = vi.fn();
    const onCancel = vi.fn();
    render(<ResetStation onComplete={onComplete} onCancel={onCancel} />);
    fireEvent.click(screen.getByRole("button", { name: "I'm ready to return" }));
    expect(onComplete).toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Back without finishing" }));
    expect(onCancel).toHaveBeenCalled();
  });
});
