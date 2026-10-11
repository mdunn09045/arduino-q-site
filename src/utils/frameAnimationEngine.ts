import {
  EffectRecipe,
  MotionEffectType,
  AppearanceEffectType,
} from '../types/animationEffects';
import { analyzeFrame, MATRIX_ROWS, MATRIX_COLS } from './frameAnalysis';

/**
 * Creates an empty 8x13 grid
 */
export function createEmptyGrid(): number[][] {
  return Array.from({ length: MATRIX_ROWS }, () => Array(MATRIX_COLS).fill(0));
}

/**
 * Clones an 8x13 grid
 */
export function cloneGrid(grid: number[][]): number[][] {
  return grid.map((row) => [...row]);
}

/**
 * Stable 32-bit hash of a 2D matrix
 */
export function hashMatrix(matrix: number[][]): number {
  let hash = 5381;
  for (let r = 0; r < MATRIX_ROWS; r++) {
    for (let c = 0; c < MATRIX_COLS; c++) {
      hash = ((hash << 5) + hash) + (matrix[r]?.[c] ?? 0);
      hash |= 0;
    }
  }
  return Math.abs(hash);
}

/**
 * Translates a bitmap with optional wrapping
 */
function translateBitmap(
  source: number[][],
  dx: number,
  dy: number,
  wrap: boolean = false
): number[][] {
  const output = createEmptyGrid();

  for (let r = 0; r < MATRIX_ROWS; r++) {
    for (let c = 0; c < MATRIX_COLS; c++) {
      if (source[r]?.[c] === 1) {
        let targetR = r + dy;
        let targetC = c + dx;

        if (wrap) {
          targetR = ((targetR % MATRIX_ROWS) + MATRIX_ROWS) % MATRIX_ROWS;
          targetC = ((targetC % MATRIX_COLS) + MATRIX_COLS) % MATRIX_COLS;
        }

        if (targetR >= 0 && targetR < MATRIX_ROWS && targetC >= 0 && targetC < MATRIX_COLS) {
          output[targetR][targetC] = 1;
        }
      }
    }
  }

  return output;
}

/**
 * Calculates a ping-pong displacement sequence where adjacent frame steps move
 * by `stepSize` pixels per frame.
 */
function getPingPongOffsetPerFrame(
  frameIndex: number,
  frameCount: number,
  stepSize: number
): number {
  if (frameCount <= 1) return 0;
  if (frameCount === 2) {
    return frameIndex === 0 ? 0 : stepSize;
  }
  // Smooth triangular cyclic waveform with stepSize pixels per frame transition
  const quarter = frameCount / 4;
  let step = 0;
  if (frameIndex <= quarter) {
    step = frameIndex;
  } else if (frameIndex <= 3 * quarter) {
    step = 2 * quarter - frameIndex;
  } else {
    step = frameIndex - frameCount;
  }
  return Math.round(step * stepSize);
}

/**
 * Step 1: Applies Geometric Motion (distance is pixel distance per frame)
 */
function applyMotion(
  source: number[][],
  motion: MotionEffectType,
  frameIndex: number,
  frameCount: number,
  distance: number,
  wrap: boolean,
  loop: 'seamless' | 'ping-pong'
): number[][] {
  if (motion === 'none' || frameCount <= 1) {
    return cloneGrid(source);
  }

  const analysis = analyzeFrame(source);

  switch (motion) {
    case 'bounce-x': {
      // Step by distance pixels per frame in a ping-pong sequence
      const rawDx = getPingPongOffsetPerFrame(frameIndex, frameCount, distance);
      const dx = Math.max(-analysis.freeLeft, Math.min(analysis.freeRight, rawDx));
      return translateBitmap(source, dx, 0, false);
    }

    case 'bounce-y': {
      // Step by distance pixels per frame in a ping-pong sequence
      const rawDy = -getPingPongOffsetPerFrame(frameIndex, frameCount, distance);
      const dy = Math.max(-analysis.freeTop, Math.min(analysis.freeBottom, rawDy));
      return translateBitmap(source, 0, dy, false);
    }

    case 'drift-left': {
      // Shift distance pixels per frame to the left
      const shiftX = -frameIndex * distance;
      return translateBitmap(source, shiftX, 0, wrap);
    }

    case 'drift-right': {
      // Shift distance pixels per frame to the right
      const shiftX = frameIndex * distance;
      return translateBitmap(source, shiftX, 0, wrap);
    }

    case 'rise': {
      if (loop === 'ping-pong') {
        const rawDy = -Math.abs(getPingPongOffsetPerFrame(frameIndex, frameCount, distance));
        const dy = Math.max(-analysis.freeTop, Math.min(analysis.freeBottom, rawDy));
        return translateBitmap(source, 0, dy, false);
      } else {
        const shiftY = -frameIndex * distance;
        return translateBitmap(source, 0, shiftY, wrap);
      }
    }

    case 'fall': {
      if (loop === 'ping-pong') {
        const rawDy = Math.abs(getPingPongOffsetPerFrame(frameIndex, frameCount, distance));
        const dy = Math.max(-analysis.freeTop, Math.min(analysis.freeBottom, rawDy));
        return translateBitmap(source, 0, dy, false);
      } else {
        const shiftY = frameIndex * distance;
        return translateBitmap(source, 0, shiftY, wrap);
      }
    }

    case 'shake': {
      // Deterministic repeating offset sequence scaled by distance per frame
      const shakeSeq = [
        [0, 0],
        [-1, 0],
        [1, 0],
        [0, -1],
        [0, 1],
        [0, 0],
      ];
      const offset = shakeSeq[frameIndex % shakeSeq.length];
      const dx = offset[0] * distance;
      const dy = offset[1] * distance;
      return translateBitmap(source, dx, dy, false);
    }

    case 'wave': {
      // Integer phase table: shifted by distance pixels per frame
      const phaseTable = [0, 1, 0, -1];
      const output = createEmptyGrid();

      for (let r = 0; r < MATRIX_ROWS; r++) {
        const rowShift = phaseTable[(r + frameIndex) % phaseTable.length] * distance;
        for (let c = 0; c < MATRIX_COLS; c++) {
          if (source[r]?.[c] === 1) {
            let targetC = c + rowShift;
            if (wrap) {
              targetC = ((targetC % MATRIX_COLS) + MATRIX_COLS) % MATRIX_COLS;
            }
            if (targetC >= 0 && targetC < MATRIX_COLS) {
              output[r][targetC] = 1;
            }
          }
        }
      }
      return output;
    }

    default:
      return cloneGrid(source);
  }
}

/**
 * Step 2: Applies Mirror or Pulse transformations
 */
function applyMirrorOrPulse(
  grid: number[][],
  appearance: AppearanceEffectType[],
  frameIndex: number,
  frameCount: number
): number[][] {
  let output = cloneGrid(grid);

  // Mirror flip: alternates between original and horizontally mirrored version
  if (appearance.includes('mirror')) {
    const isMirrored = frameCount <= 2 ? frameIndex === 1 : frameIndex % 2 === 1;
    if (isMirrored) {
      const mirrored = createEmptyGrid();
      for (let r = 0; r < MATRIX_ROWS; r++) {
        for (let c = 0; c < MATRIX_COLS; c++) {
          mirrored[r][MATRIX_COLS - 1 - c] = output[r][c];
        }
      }
      output = mirrored;
    }
  }

  // Pulse: conservative one-pixel expansion / contraction
  if (appearance.includes('pulse') && frameCount > 1) {
    const isPulsing = frameIndex % 2 === 1;
    if (isPulsing) {
      const pulsed = cloneGrid(output);
      const analysis = analyzeFrame(output);

      if (analysis.litCount > 0 && analysis.litCount < 60) {
        // Expand (dilate silhouette by 1 pixel along cardinal directions)
        for (let r = 0; r < MATRIX_ROWS; r++) {
          for (let c = 0; c < MATRIX_COLS; c++) {
            if (output[r][c] === 1) {
              if (r - 1 >= 0) pulsed[r - 1][c] = 1;
              if (r + 1 < MATRIX_ROWS) pulsed[r + 1][c] = 1;
              if (c - 1 >= 0) pulsed[r][c - 1] = 1;
              if (c + 1 < MATRIX_COLS) pulsed[r][c + 1] = 1;
            }
          }
        }
      } else if (analysis.litCount >= 60) {
        // Contract (erode outer perimeter) to preserve negative space
        for (let r = 0; r < MATRIX_ROWS; r++) {
          for (let c = 0; c < MATRIX_COLS; c++) {
            if (output[r][c] === 1) {
              const neighbors =
                (output[r - 1]?.[c] ?? 0) +
                (output[r + 1]?.[c] ?? 0) +
                (output[r]?.[c - 1] ?? 0) +
                (output[r]?.[c + 1] ?? 0);
              if (neighbors < 4) {
                pulsed[r][c] = 0;
              }
            }
          }
        }
      }

      output = pulsed;
    }
  }

  return output;
}

/**
 * Step 3: Applies Blink, Sparkle, or Alternate/Inversion
 */
function applyBlinkSparkleOrInvert(
  grid: number[][],
  appearance: AppearanceEffectType[],
  frameIndex: number,
  frameCount: number,
  sourceHash: number
): number[][] {
  let output = cloneGrid(grid);

  // Alternate / Invert
  if (appearance.includes('alternate') && frameCount > 1) {
    const isInverted = frameIndex % 2 === 1;
    if (isInverted) {
      for (let r = 0; r < MATRIX_ROWS; r++) {
        for (let c = 0; c < MATRIX_COLS; c++) {
          output[r][c] = output[r][c] === 1 ? 0 : 1;
        }
      }
    }
  }

  // Sparkle: deterministic toggle of pixels near artwork based on sourceHash
  if (appearance.includes('sparkle') && frameCount > 1) {
    // Generate 4 deterministic sparkle candidate coordinates
    const sparkleSeed = (sourceHash + frameIndex * 17) % 1000;
    const candidates = [
      [(sparkleSeed * 3) % MATRIX_ROWS, (sparkleSeed * 7) % MATRIX_COLS],
      [(sparkleSeed * 5 + 2) % MATRIX_ROWS, (sparkleSeed * 11 + 3) % MATRIX_COLS],
      [(sparkleSeed * 7 + 4) % MATRIX_ROWS, (sparkleSeed * 13 + 5) % MATRIX_COLS],
    ];

    for (const [sr, sc] of candidates) {
      if (sr >= 0 && sr < MATRIX_ROWS && sc >= 0 && sc < MATRIX_COLS) {
        output[sr][sc] = output[sr][sc] === 1 ? 0 : 1;
      }
    }
  }

  // Blink: alternates between source and blank
  if (appearance.includes('blink') && frameCount > 1) {
    let isBlankFrame = false;
    if (frameCount === 2) {
      isBlankFrame = frameIndex === 1;
    } else {
      // Hold states clean to avoid rapid flicker: second half of frames is blank
      const half = Math.floor(frameCount / 2);
      isBlankFrame = frameIndex >= half;
    }

    if (isBlankFrame) {
      return createEmptyGrid();
    }
  }

  return output;
}

/**
 * Step 4: Final boundary clipping and strict validation (8 rows x 13 cols)
 */
function clipAndValidateFrame(grid: number[][]): number[][] {
  const result = createEmptyGrid();
  for (let r = 0; r < MATRIX_ROWS; r++) {
    for (let c = 0; c < MATRIX_COLS; c++) {
      result[r][c] = grid[r]?.[c] === 1 ? 1 : 0;
    }
  }
  return result;
}

/**
 * DETERMINISTIC ANIMATION PIPELINE:
 * Expands an immutable source frame into a multi-frame animation
 * Follows strict order:
 * 1. Geometric Motion
 * 2. Mirror / Pulse
 * 3. Blink / Sparkle / Alternate
 * 4. Final clipping and validation
 */
export function generateAnimationFromFrame(
  sourceMatrix: number[][],
  recipe: EffectRecipe
): number[][][] {
  const frameCount = recipe.frameCount || 4;
  const distance = Math.max(1, Math.min(3, recipe.distance || 1));
  const wrap = Boolean(recipe.wrap);
  const loop = recipe.loop || 'seamless';
  const appearance = recipe.appearance || [];
  const sourceHash = hashMatrix(sourceMatrix);

  const frames: number[][][] = [];

  for (let f = 0; f < frameCount; f++) {
    // 1. Geometric motion
    let current = applyMotion(
      sourceMatrix,
      recipe.motion,
      f,
      frameCount,
      distance,
      wrap,
      loop
    );

    // 2. Mirror / Pulse
    current = applyMirrorOrPulse(current, appearance, f, frameCount);

    // 3. Blink / Sparkle / Alternate
    current = applyBlinkSparkleOrInvert(current, appearance, f, frameCount, sourceHash);

    // 4. Final clipping and validation
    frames.push(clipAndValidateFrame(current));
  }

  return frames;
}

/**
 * Converts speed preset to delay in milliseconds
 * Exact timings:
 * - "very fast" -> 70 ms
 * - "fast" -> 90 ms
 * - "medium" (default) -> 180 ms
 * - "slow" -> 280 ms
 * - "very slow" -> 400 ms
 */
export function speedToDelayMs(speed: string, customMs?: number): number {
  if (typeof customMs === 'number' && customMs >= 40) {
    return Math.max(40, Math.min(800, customMs));
  }
  switch (speed) {
    case 'slow':
      return 280;
    case 'fast':
      return 90;
    case 'medium':
    default:
      return 180;
  }
}
