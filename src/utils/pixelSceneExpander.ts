import { PixelScenePlan, PixelSceneLayer, SupportedAnimationType } from '../types/pixelScene';

export const MATRIX_ROWS = 8;
export const MATRIX_COLS = 13;

/**
 * Creates an empty 8x13 grid
 */
export function createEmptyGrid(): number[][] {
  return Array.from({ length: MATRIX_ROWS }, () => Array(MATRIX_COLS).fill(0));
}

/**
 * Converts a layer's 8x13 string rows into a numeric 2D binary matrix
 */
export function layerRowsToMatrix(rows: string[]): number[][] {
  const matrix = createEmptyGrid();
  for (let r = 0; r < Math.min(rows.length, MATRIX_ROWS); r++) {
    const rowStr = rows[r] || '';
    for (let c = 0; c < Math.min(rowStr.length, MATRIX_COLS); c++) {
      matrix[r][c] = rowStr[c] === '#' ? 1 : 0;
    }
  }
  return matrix;
}

/**
 * Expands a single layer at a specific frame index into an 8x13 binary matrix
 */
export function expandLayerAtFrame(
  layer: PixelSceneLayer,
  frameIndex: number,
  frameCount: number
): number[][] {
  const outGrid = createEmptyGrid();
  const baseMatrix = layerRowsToMatrix(layer.rows);
  const anim = layer.animation || { type: 'static' };
  const animType: SupportedAnimationType = anim.type || 'static';
  const dist = typeof anim.distance === 'number' && anim.distance > 0 ? anim.distance : 2;
  const phase = typeof anim.phase === 'number' ? anim.phase : 0;

  // Single-frame scenes are static
  if (frameCount <= 1) {
    return baseMatrix;
  }

  // Calculate normalized loop progress [0, 1)
  const normTime = ((frameIndex / frameCount) + phase) % 1;

  switch (animType) {
    case 'static': {
      return baseMatrix;
    }

    case 'blink': {
      // Blink duty cycle: on for first half, off or subtle for second half
      const isVisible = normTime < 0.55;
      if (!isVisible) {
        return outGrid;
      }
      return baseMatrix;
    }

    case 'bounce-x': {
      // Horizontal sinusoidal oscillation
      const offsetX = Math.round(dist * Math.sin(2 * Math.PI * normTime));
      for (let r = 0; r < MATRIX_ROWS; r++) {
        for (let c = 0; c < MATRIX_COLS; c++) {
          if (baseMatrix[r][c] === 1) {
            const targetC = c + offsetX;
            if (targetC >= 0 && targetC < MATRIX_COLS) {
              outGrid[r][targetC] = 1;
            }
          }
        }
      }
      return outGrid;
    }

    case 'bounce-y': {
      // Vertical sinusoidal oscillation
      const offsetY = Math.round(dist * Math.sin(2 * Math.PI * normTime));
      for (let r = 0; r < MATRIX_ROWS; r++) {
        for (let c = 0; c < MATRIX_COLS; c++) {
          if (baseMatrix[r][c] === 1) {
            const targetR = r + offsetY;
            if (targetR >= 0 && targetR < MATRIX_ROWS) {
              outGrid[targetR][c] = 1;
            }
          }
        }
      }
      return outGrid;
    }

    case 'drift-x': {
      // Continuous horizontal drift / scroll in loop
      const dirMult = anim.direction === 'left' ? -1 : 1;
      const totalShift = anim.distance || MATRIX_COLS;
      const offsetX = Math.round((normTime * totalShift) * dirMult);
      for (let r = 0; r < MATRIX_ROWS; r++) {
        for (let c = 0; c < MATRIX_COLS; c++) {
          if (baseMatrix[r][c] === 1) {
            let targetC = c + offsetX;
            if (anim.loop !== false) {
              // Wrap horizontally
              targetC = ((targetC % MATRIX_COLS) + MATRIX_COLS) % MATRIX_COLS;
            }
            if (targetC >= 0 && targetC < MATRIX_COLS) {
              outGrid[r][targetC] = 1;
            }
          }
        }
      }
      return outGrid;
    }

    case 'drift-y': {
      // Continuous vertical drift / scroll in loop
      const dirMult = anim.direction === 'up' ? -1 : 1;
      const totalShift = anim.distance || MATRIX_ROWS;
      const offsetY = Math.round((normTime * totalShift) * dirMult);
      for (let r = 0; r < MATRIX_ROWS; r++) {
        for (let c = 0; c < MATRIX_COLS; c++) {
          if (baseMatrix[r][c] === 1) {
            let targetR = r + offsetY;
            if (anim.loop !== false) {
              targetR = ((targetR % MATRIX_ROWS) + MATRIX_ROWS) % MATRIX_ROWS;
            }
            if (targetR >= 0 && targetR < MATRIX_ROWS) {
              outGrid[targetR][c] = 1;
            }
          }
        }
      }
      return outGrid;
    }

    case 'rise-and-fade': {
      // Rises upward, gently fading or dissolving near apex
      const riseDist = anim.distance || 3;
      const offsetY = -Math.round(normTime * riseDist);
      const isLateCycle = normTime > 0.7;

      for (let r = 0; r < MATRIX_ROWS; r++) {
        for (let c = 0; c < MATRIX_COLS; c++) {
          if (baseMatrix[r][c] === 1) {
            const targetR = r + offsetY;
            // Fade top pixels near apex of the rise
            if (targetR >= 0 && targetR < MATRIX_ROWS) {
              if (isLateCycle && targetR < 2 && (r + c) % 2 === 0) {
                // Dissolve outer pixels
                continue;
              }
              outGrid[targetR][c] = 1;
            }
          }
        }
      }
      return outGrid;
    }

    case 'pulse': {
      // Beating / pulsing: expands by 1 pixel or alternates dilation
      const isExpanded = Math.sin(2 * Math.PI * normTime) > 0.2;
      for (let r = 0; r < MATRIX_ROWS; r++) {
        for (let c = 0; c < MATRIX_COLS; c++) {
          if (baseMatrix[r][c] === 1) {
            outGrid[r][c] = 1;
            if (isExpanded) {
              // Add gentle halo/dilation along borders
              if (r - 1 >= 0) outGrid[r - 1][c] = 1;
              if (r + 1 < MATRIX_ROWS) outGrid[r + 1][c] = 1;
              if (c - 1 >= 0) outGrid[r][c - 1] = 1;
              if (c + 1 < MATRIX_COLS) outGrid[r][c + 1] = 1;
            }
          }
        }
      }
      return outGrid;
    }

    case 'alternate': {
      // Alternate step every other frame
      const isEven = frameIndex % 2 === 0;
      const shiftX = isEven ? 0 : (anim.direction === 'left' ? -1 : 1);
      for (let r = 0; r < MATRIX_ROWS; r++) {
        for (let c = 0; c < MATRIX_COLS; c++) {
          if (baseMatrix[r][c] === 1) {
            const targetC = c + shiftX;
            if (targetC >= 0 && targetC < MATRIX_COLS) {
              outGrid[r][targetC] = 1;
            }
          }
        }
      }
      return outGrid;
    }

    case 'wave': {
      // Vertical wave propagation across columns
      const waveDist = anim.distance || 1;
      for (let c = 0; c < MATRIX_COLS; c++) {
        const offsetY = Math.round(
          waveDist * Math.sin(2 * Math.PI * (normTime + c / 6))
        );
        for (let r = 0; r < MATRIX_ROWS; r++) {
          if (baseMatrix[r][c] === 1) {
            const targetR = r + offsetY;
            if (targetR >= 0 && targetR < MATRIX_ROWS) {
              outGrid[targetR][c] = 1;
            }
          }
        }
      }
      return outGrid;
    }

    case 'orbit': {
      // Elliptical 2D orbit
      const rx = anim.distance || 2;
      const ry = Math.max(1, Math.round(rx / 2));
      const offsetX = Math.round(rx * Math.cos(2 * Math.PI * normTime));
      const offsetY = Math.round(ry * Math.sin(2 * Math.PI * normTime));

      for (let r = 0; r < MATRIX_ROWS; r++) {
        for (let c = 0; c < MATRIX_COLS; c++) {
          if (baseMatrix[r][c] === 1) {
            const targetR = r + offsetY;
            const targetC = c + offsetX;
            if (
              targetR >= 0 &&
              targetR < MATRIX_ROWS &&
              targetC >= 0 &&
              targetC < MATRIX_COLS
            ) {
              outGrid[targetR][targetC] = 1;
            }
          }
        }
      }
      return outGrid;
    }

    case 'ping-pong': {
      // Linear back and forth ping-pong
      const ping = 1 - Math.abs(2 * normTime - 1);
      const offsetX = Math.round((anim.distance || 2) * ping);
      for (let r = 0; r < MATRIX_ROWS; r++) {
        for (let c = 0; c < MATRIX_COLS; c++) {
          if (baseMatrix[r][c] === 1) {
            const targetC = c + offsetX;
            if (targetC >= 0 && targetC < MATRIX_COLS) {
              outGrid[r][targetC] = 1;
            }
          }
        }
      }
      return outGrid;
    }

    default:
      return baseMatrix;
  }
}

/**
 * Expands a complete PixelScenePlan into an array of 8x13 frames
 * Clips safely at canvas boundaries and merges layers using logical OR
 */
export function expandPixelScene(plan: PixelScenePlan): number[][][] {
  const frameCount = Math.max(1, Math.min(16, plan.frameCount || 1));
  const frames: number[][][] = [];

  for (let f = 0; f < frameCount; f++) {
    const frameGrid = createEmptyGrid();

    // Composite each layer
    for (const layer of plan.layers || []) {
      const layerGrid = expandLayerAtFrame(layer, f, frameCount);
      for (let r = 0; r < MATRIX_ROWS; r++) {
        for (let c = 0; c < MATRIX_COLS; c++) {
          if (layerGrid[r][c] === 1) {
            frameGrid[r][c] = 1;
          }
        }
      }
    }

    frames.push(frameGrid);
  }

  return frames;
}
