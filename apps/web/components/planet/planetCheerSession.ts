export type CheerPlanet = "science" | "numeria";

function key(planet: CheerPlanet): string {
  return `wiggle:planet-cheer:${planet}`;
}

export function hasCheeredPlanet(planet: CheerPlanet): boolean {
  try {
    return window.sessionStorage.getItem(key(planet)) === "1";
  } catch {
    return false;
  }
}

export function markCheeredPlanet(planet: CheerPlanet): void {
  try {
    window.sessionStorage.setItem(key(planet), "1");
  } catch { /* best-effort */ }
}
