// apps/web/components/universe/ExplorationHud.test.tsx
// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { ExplorationHud } from "./ExplorationHud";
import { LANDMARKS } from "./world";

afterEach(cleanup);

const baseProps = {
  mode: "follow" as const,
  mapVisible: false,
  selectedLandmark: LANDMARKS[0].id,
  landmark: LANDMARKS[0],
  help: false,
  onHelpChange: vi.fn(),
  onModeChange: vi.fn(),
  onToggleMap: vi.fn(),
  onSelectLandmark: vi.fn(),
  instructionsId: "instructions",
  missionVisible: false,
};

describe("ExplorationHud", () => {
  it("no longer renders its own Twin or Parent links — the global launcher and ParentEntryLink cover them now", () => {
    render(<ExplorationHud {...baseProps} />);
    expect(screen.queryByRole("link", { name: "My Wiggle Twin" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Parent mission control" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Parent mission control" })).toBeNull();
  });

  it("still omits both links while a mission is visible", () => {
    render(<ExplorationHud {...baseProps} missionVisible />);
    expect(screen.queryByRole("link", { name: "My Wiggle Twin" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Parent mission control" })).toBeNull();
  });

  it("lists only the four learning regions as Numeria destinations", () => {
    render(<ExplorationHud {...baseProps} />);

    fireEvent.click(screen.getByRole("button", { name: "Places" }));
    const navigator = screen.getByRole("navigation", { name: "Numeria destinations" });
    expect(within(navigator).getAllByRole("button", { name: /^Visit / })).toHaveLength(4);
    expect(within(navigator).queryByRole("button", { name: "Visit Lexi's beacon" })).toBeNull();
  });
});
