import { FrameAnalysis } from '../types/animationEffects';

export const MATRIX_ROWS = 8;
export const MATRIX_COLS = 13;

/**
 * Deterministically analyzes a 13x8 binary bitmap
 */
export function analyzeFrame(matrix: number[][]): FrameAnalysis {
  let litCount = 0;
  let minRow = MATRIX_ROWS;
  let maxRow = -1;
  let minCol = MATRIX_COLS;
  let maxCol = -1;

  for (let r = 0; r < MATRIX_ROWS; r++) {
    for (let c = 0; c < MATRIX_COLS; c++) {
      if (matrix[r]?.[c] === 1) {
        litCount++;
        if (r < minRow) minRow = r;
        if (r > maxRow) maxRow = r;
        if (c < minCol) minCol = c;
        if (c > maxCol) maxCol = c;
      }
    }
  }

  const isBlank = litCount === 0;
  const isFull = litCount === MATRIX_ROWS * MATRIX_COLS;

  if (isBlank) {
    return {
      litCount: 0,
      minRow: 0,
      maxRow: 0,
      minCol: 0,
      maxCol: 0,
      freeTop: 8,
      freeBottom: 8,
      freeLeft: 13,
      freeRight: 13,
      isHorizSymmetric: true,
      isVertSymmetric: true,
      touchesEdge: false,
      isBlank: true,
      isFull: false,
      summary: 'Blank canvas (0 lit LEDs)',
    };
  }

  const freeTop = minRow;
  const freeBottom = MATRIX_ROWS - 1 - maxRow;
  const freeLeft = minCol;
  const freeRight = MATRIX_COLS - 1 - maxCol;
  const touchesEdge = freeTop === 0 || freeBottom === 0 || freeLeft === 0 || freeRight === 0;

  // Check horizontal symmetry (mirrored across column 6)
  let isHorizSymmetric = true;
  for (let r = 0; r < MATRIX_ROWS; r++) {
    for (let c = 0; c < 6; c++) {
      if ((matrix[r]?.[c] ?? 0) !== (matrix[r]?.[MATRIX_COLS - 1 - c] ?? 0)) {
        isHorizSymmetric = false;
        break;
      }
    }
    if (!isHorizSymmetric) break;
  }

  // Check vertical symmetry (mirrored across horizontal midpoint)
  let isVertSymmetric = true;
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < MATRIX_COLS; c++) {
      if ((matrix[r]?.[c] ?? 0) !== (matrix[MATRIX_ROWS - 1 - r]?.[c] ?? 0)) {
        isVertSymmetric = false;
        break;
      }
    }
    if (!isVertSymmetric) break;
  }

  const centeredHoriz = Math.abs(freeLeft - freeRight) <= 1;
  const centeredVert = Math.abs(freeTop - freeBottom) <= 1;
  const posDesc = centeredHoriz && centeredVert ? 'centered' : 'offset';
  const symDesc = isHorizSymmetric ? 'horizontally symmetrical' : 'asymmetrical';

  const summary = `Artwork: ${litCount} lit pixels; ${posDesc}; ${symDesc}; ${freeTop}px free above; ${freeBottom}px free below; ${freeLeft}px free left; ${freeRight}px free right.`;

  return {
    litCount,
    minRow,
    maxRow,
    minCol,
    maxCol,
    freeTop,
    freeBottom,
    freeLeft,
    freeRight,
    isHorizSymmetric,
    isVertSymmetric,
    touchesEdge,
    isBlank,
    isFull,
    summary,
  };
}
