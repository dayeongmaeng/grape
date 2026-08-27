/**
 * Row-length layouts used to arrange grape cells into a bunch shape
 * (wide at the top, tapering to a point — like a real cluster of grapes).
 */

/** Fixed 14-slot shape used for compact progress previews (list rows, archive cards). */
export const MINI_BUNCH_SHAPE = [4, 4, 3, 2, 1];

/** Small decorative shape used for the login-screen logo mark. */
export const LOGO_BUNCH_SHAPE = [3, 4, 3, 2];

/**
 * Fills rows by cycling a row width down from `topWidth` to 1 (restarting at
 * `topWidth` if more cells remain), then sorts the rows widest-first so the
 * bunch always narrows smoothly to a single closing cell at the tip,
 * regardless of how the cycling landed.
 */
function buildTaperShape(total: number, topWidth: number): number[] {
  const shape: number[] = [];
  let remaining = total;
  let width = topWidth;
  while (remaining > 0) {
    const n = Math.min(width, remaining);
    shape.push(n);
    remaining -= n;
    width = width > 1 ? width - 1 : topWidth;
  }
  return shape.sort((a, b) => b - a);
}

/** Generates a tapering bunch shape whose cell count sums to `total`. */
export function generateBunchShape(total: number): number[] {
  if (total <= 0) return [];
  const topWidth = Math.max(2, Math.min(6, Math.round(Math.sqrt(total * 0.9))));
  return buildTaperShape(total, topWidth);
}

/** Scales a `filled / total` ratio onto the fixed mini shape's 14 slots. */
export function scaleToMiniFilled(filled: number, total: number): number {
  if (total <= 0) return 0;
  const slots = MINI_BUNCH_SHAPE.reduce((a, b) => a + b, 0);
  return Math.round((filled / total) * slots);
}

/**
 * Largest cell size (down to a small floor) that fits every row of `shape`
 * inside `maxWidth` × `maxHeight`, so a big custom bunch (e.g. 1000 grapes)
 * shrinks to stay on screen instead of spilling past its container. Gap and
 * row spacing scale down with the cell size, keeping the same proportions
 * as `baseCellSize`/`baseGap`/`baseRowGap`.
 */
export function fitCellSize(
  shape: number[],
  maxWidth: number,
  maxHeight: number,
  baseCellSize: number,
  baseGap: number,
  baseRowGap: number,
): { cellSize: number; gap: number; rowGap: number } {
  const widest = shape.length ? Math.max(...shape) : 0;
  const rows = shape.length;
  if (widest === 0 || rows === 0 || maxWidth <= 0 || maxHeight <= 0) {
    return { cellSize: baseCellSize, gap: baseGap, rowGap: baseRowGap };
  }

  const gapRatio = baseGap / baseCellSize;
  const rowGapRatio = baseRowGap / baseCellSize;
  const widthFactor = widest + (widest - 1) * gapRatio;
  const heightFactor = rows + (rows - 1) * rowGapRatio;

  // No integer rounding or minimum-size floor here: for a very large custom
  // total (e.g. 1000), the bunch must shrink as far as the math requires to
  // stay fully inside the container, even past the point of being legible.
  const cellSize = Math.max(1, Math.min(baseCellSize, maxWidth / widthFactor, maxHeight / heightFactor));

  return {
    cellSize,
    gap: cellSize * gapRatio,
    rowGap: cellSize * rowGapRatio,
  };
}

/**
 * Builds a bunch shape sized to fit inside `maxWidth` × `maxHeight`, widening
 * it (more grapes per row, fewer rows) instead of only shrinking the cells
 * once `total` is large enough that the normal fixed-width taper would need
 * hundreds of tiny rows. Falls back to `generateBunchShape`'s usual width
 * (and the given base size) when the container hasn't been measured yet.
 */
export function generateFittedBunch(
  total: number,
  maxWidth: number,
  maxHeight: number,
  baseCellSize: number,
  baseGap: number,
  baseRowGap: number,
): { shape: number[]; cellSize: number; gap: number; rowGap: number } {
  if (total <= 0) return { shape: [], cellSize: baseCellSize, gap: baseGap, rowGap: baseRowGap };
  if (maxWidth <= 0 || maxHeight <= 0) {
    return { shape: generateBunchShape(total), cellSize: baseCellSize, gap: baseGap, rowGap: baseRowGap };
  }

  const defaultTopWidth = Math.max(2, Math.min(6, Math.round(Math.sqrt(total * 0.9))));
  // A row of `topWidth` cells and `total / topWidth` rows fills the
  // container evenly when its width-to-height ratio matches the container's
  // — i.e. topWidth ≈ sqrt(total · aspect). That's only an estimate (the
  // taper's fixed top-to-point overhead skews the real optimum), so search
  // a margin around it and keep whichever width actually yields the
  // largest cell. Never go narrower than the usual shape, so normal-sized
  // bunches keep their already-tuned proportions.
  const aspectEstimate = Math.max(2, Math.round(Math.sqrt(total * (maxWidth / maxHeight) * 0.9)));
  const searchFrom = Math.max(defaultTopWidth, 2);
  const searchTo = Math.max(searchFrom, Math.min(total, aspectEstimate * 2, 60));

  let shape = buildTaperShape(total, searchFrom);
  let best = fitCellSize(shape, maxWidth, maxHeight, baseCellSize, baseGap, baseRowGap);
  for (let w = searchFrom + 1; w <= searchTo; w += 1) {
    const candidateShape = buildTaperShape(total, w);
    const candidateFit = fitCellSize(candidateShape, maxWidth, maxHeight, baseCellSize, baseGap, baseRowGap);
    if (candidateFit.cellSize > best.cellSize) {
      shape = candidateShape;
      best = candidateFit;
    }
  }
  return { shape, ...best };
}
