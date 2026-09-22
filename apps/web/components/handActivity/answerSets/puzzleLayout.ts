import type { BenchPoint } from "../handBenchPlay";

/**
 * Stepping stones for a number trail: an arch from the left of the bench to the right, in bench coordinates. Stones are
 * about .56 world units wide, so this is laid out for up to four stones; more would touch.
 */
export function stoneTrail(count: number): BenchPoint[] {
  return Array.from({ length: Math.max(0, count) }, (_, index) => {
    const t = count === 1 ? .5 : index / (count - 1);
    return { x: .14 + t * .72, y: .62 + Math.sin(t * Math.PI) * .14 };
  });
}

/** Corners of a regular polygon, flat side down, sized to sit in the puzzle area above the answer row. */
export function polygonPoints(sides: number): { x: number; y: number }[] {
  const radius = .27;
  const centerY = .68;
  const rotation = -(Math.PI / sides + Math.PI / 2);
  return Array.from({ length: sides }, (_, index) => {
    const angle = rotation + (index / sides) * Math.PI * 2;
    return { x: .5 + Math.cos(angle) * radius, y: centerY + Math.sin(angle) * radius * .82 };
  });
}

/** Offsets for a tidy grid of crystals, centred on the origin, in world units (not bench 0-1 space). */
export function crystalOffsets(count: number): { x: number; y: number }[] {
  if (count === 0) return [];
  const perRow = Math.min(count, 4);
  const rows = Math.ceil(count / perRow);
  const spacing = .26;
  return Array.from({ length: count }, (_, index) => {
    const row = Math.floor(index / perRow);
    const isLastRow = row === rows - 1;
    const inRow = isLastRow && count % perRow !== 0 ? count % perRow : perRow;
    const col = index % perRow;
    return { x: (col - (inRow - 1) / 2) * spacing, y: (row - (rows - 1) / 2) * spacing };
  });
}
