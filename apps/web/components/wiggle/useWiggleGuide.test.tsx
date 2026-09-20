// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { act, cleanup, fireEvent, render, renderHook } from "@testing-library/react";
import { useWiggleGuide } from "./useWiggleGuide";

afterEach(cleanup);

describe("useWiggleGuide", () => {
  it("shows a tip on hover and on keyboard focus, and clears it when the child moves away", () => {
    const { container } = render(<div><button aria-label="Zoom in">+</button><p>Nothing here</p></div>);
    const { result } = renderHook(() => useWiggleGuide(true));
    const button = container.querySelector("button")!;
    act(() => { fireEvent.pointerOver(button); });
    expect(result.current).toMatch(/closer/);
    act(() => { fireEvent.pointerOver(container.querySelector("p")!); });
    expect(result.current).toBeNull();
    act(() => { button.focus(); });
    expect(result.current).toMatch(/closer/);
    act(() => { button.blur(); });
    expect(result.current).toBeNull();
  });

  it("shows a tip on a touch tap", () => {
    const { container } = render(<button aria-label="Run">Run</button>);
    const { result } = renderHook(() => useWiggleGuide(true));
    act(() => { fireEvent(container.querySelector("button")!, Object.assign(new Event("pointerdown", { bubbles: true }), { pointerType: "touch" })); });
    expect(result.current).toMatch(/walk faster/);
  });

  it("says nothing while disabled", () => {
    const { container } = render(<button aria-label="Run">Run</button>);
    const { result } = renderHook(() => useWiggleGuide(false));
    act(() => { fireEvent.pointerOver(container.querySelector("button")!); });
    expect(result.current).toBeNull();
  });
});
