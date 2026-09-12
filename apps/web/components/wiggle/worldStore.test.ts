import { beforeEach, describe, expect, it } from "vitest";
import { useWorldStore } from "./worldStore";

const resetStore = () =>
  useWorldStore.setState({
    phase: "opening",
    selectedPlanetId: null,
    discoveredWonderIds: [],
    spaceLogOpen: false,
    reducedMotion: false,
  });

describe("world store", () => {
  beforeEach(resetStore);

  it("starts in the opening phase", () => {
    expect(useWorldStore.getState().phase).toBe("opening");
  });

  it("enters the hub from the opening", () => {
    useWorldStore.getState().enterHub();
    expect(useWorldStore.getState()).toMatchObject({ phase: "hub", selectedPlanetId: null });
  });

  it("selects a planet for preview", () => {
    useWorldStore.getState().selectPlanet("lexicon");
    expect(useWorldStore.getState()).toMatchObject({ phase: "preview", selectedPlanetId: "lexicon" });
  });

  it("enters Numeria", () => {
    useWorldStore.getState().enterNumeria();
    expect(useWorldStore.getState()).toMatchObject({ phase: "numeria", selectedPlanetId: "numeria" });
  });

  it("records each wonder only once", () => {
    useWorldStore.getState().recordWonder("forest-firefly");
    useWorldStore.getState().recordWonder("forest-firefly");
    expect(useWorldStore.getState().discoveredWonderIds).toEqual(["forest-firefly"]);
  });

  it("toggles the Space Log and reduced-motion preference", () => {
    useWorldStore.getState().toggleSpaceLog();
    useWorldStore.getState().setReducedMotion(true);
    expect(useWorldStore.getState()).toMatchObject({ spaceLogOpen: true, reducedMotion: true });
  });

  it("works when browser storage is unavailable", () => {
    expect(() => useWorldStore.getState().recordWonder("storage-safe")).not.toThrow();
    expect(useWorldStore.getState().discoveredWonderIds).toContain("storage-safe");
  });
});
