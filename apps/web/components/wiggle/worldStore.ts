import { create } from "zustand";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";
import type { PlanetId } from "./worlds";

export type WorldPhase = "opening" | "hub" | "preview" | "numeria";

export type WorldState = {
  phase: WorldPhase;
  selectedPlanetId: PlanetId | null;
  discoveredWonderIds: string[];
  spaceLogOpen: boolean;
  reducedMotion: boolean;
  enterHub: () => void;
  selectPlanet: (id: PlanetId) => void;
  enterNumeria: () => void;
  recordWonder: (id: string) => void;
  toggleSpaceLog: () => void;
  setReducedMotion: (value: boolean) => void;
};

const initialState = {
  phase: "opening" as WorldPhase,
  selectedPlanetId: null,
  discoveredWonderIds: [] as string[],
  spaceLogOpen: false,
  reducedMotion: false,
};

const unavailableStorage: StateStorage = {
  getItem: () => null,
  setItem: () => undefined,
  removeItem: () => undefined,
};

const getStorage = (): StateStorage => {
  if (typeof window === "undefined" || !window.localStorage) return unavailableStorage;
  return window.localStorage;
};

export const useWorldStore = create<WorldState>()(
  persist(
    (set) => ({
      ...initialState,
      enterHub: () => set({ phase: "hub", selectedPlanetId: null }),
      selectPlanet: (id) => set({ selectedPlanetId: id, phase: "preview" }),
      enterNumeria: () => set({ selectedPlanetId: "numeria", phase: "numeria" }),
      recordWonder: (id) =>
        set((state) =>
          state.discoveredWonderIds.includes(id)
            ? state
            : { discoveredWonderIds: [...state.discoveredWonderIds, id] },
        ),
      toggleSpaceLog: () => set((state) => ({ spaceLogOpen: !state.spaceLogOpen })),
      setReducedMotion: (value) => set({ reducedMotion: value }),
    }),
    {
      name: "wiggle-world-v1",
      storage: createJSONStorage(getStorage),
      partialize: (state) => ({
        discoveredWonderIds: state.discoveredWonderIds,
        spaceLogOpen: state.spaceLogOpen,
        reducedMotion: state.reducedMotion,
      }),
    },
  ),
);
