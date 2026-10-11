import {
  PixelScenePlan,
  PixelSceneLayer,
  SupportedAnimationType,
} from '../types/pixelScene';
import { MATRIX_COLS, MATRIX_ROWS } from './pixelSceneExpander';

export const VALID_ANIMATION_TYPES: SupportedAnimationType[] = [
  'static',
  'blink',
  'bounce-x',
  'bounce-y',
  'drift-x',
  'drift-y',
  'rise-and-fade',
  'pulse',
  'alternate',
  'wave',
  'orbit',
  'ping-pong',
];

/**
 * Defensive JSON extraction from raw model text output
 */
export function extractJsonFromText(rawText: string): any {
  if (!rawText || typeof rawText !== 'string') {
    throw new Error('Empty model output');
  }

  // 1. First attempt: clean markdown code blocks
  let cleaned = rawText.trim();
  const codeBlockRegex = /```(?:json)?\s*([\s\S]*?)\s*```/i;
  const match = cleaned.match(codeBlockRegex);
  if (match && match[1]) {
    cleaned = match[1].trim();
  }

  // Try parsing directly
  try {
    return JSON.parse(cleaned);
  } catch {
    // Continue to balanced brace extraction
  }

  // 2. Find first '{' and balance braces
  const firstBrace = rawText.indexOf('{');
  if (firstBrace === -1) {
    throw new Error('No JSON object found in output');
  }

  let depth = 0;
  let inString = false;
  let escape = false;
  let endBrace = -1;

  for (let i = firstBrace; i < rawText.length; i++) {
    const char = rawText[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (char === '\\') {
      escape = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (!inString) {
      if (char === '{') {
        depth++;
      } else if (char === '}') {
        depth--;
        if (depth === 0) {
          endBrace = i;
          break;
        }
      }
    }
  }

  if (endBrace !== -1) {
    const candidate = rawText.slice(firstBrace, endBrace + 1);
    try {
      return JSON.parse(candidate);
    } catch {
      // Try repair on candidate
      return attemptLocalJsonRepair(candidate);
    }
  }

  // 3. Fallback repair on trailing substring
  return attemptLocalJsonRepair(rawText.slice(firstBrace));
}

/**
 * Single-pass local repair for common LLM JSON syntax imperfections
 */
export function attemptLocalJsonRepair(jsonStr: string): any {
  let repaired = jsonStr.trim();

  // Remove trailing commas before } or ]
  repaired = repaired.replace(/,\s*([}\]])/g, '$1');

  // Replace single quotes with double quotes around keys/values
  repaired = repaired.replace(/'/g, '"');

  // Balance unclosed quotes
  const quoteCount = (repaired.match(/"/g) || []).length;
  if (quoteCount % 2 !== 0) {
    repaired += '"';
  }

  // Balance unclosed brackets/braces
  let openCurly = (repaired.match(/\{/g) || []).length;
  let closeCurly = (repaired.match(/\}/g) || []).length;
  while (closeCurly < openCurly) {
    repaired += '}';
    closeCurly++;
  }

  let openSquare = (repaired.match(/\[/g) || []).length;
  let closeSquare = (repaired.match(/\]/g) || []).length;
  while (closeSquare < openSquare) {
    repaired += ']';
    closeSquare++;
  }

  // Try parsing repaired string
  try {
    return JSON.parse(repaired);
  } catch (err: any) {
    throw new Error(`JSON repair failed: ${err.message || 'Syntax error'}`);
  }
}

/**
 * Normalizes a single row string to exactly 13 characters of '.' and '#'
 */
export function normalizeRowString(rowInput: any): string {
  if (typeof rowInput !== 'string') {
    return '.'.repeat(MATRIX_COLS);
  }

  // Replace common ON representations (*, 1, #, X, x) with '#'
  let chars = rowInput
    .replace(/[*1Xx@]/g, '#')
    .replace(/[0\-_ ]/g, '.');

  // Ensure only '.' and '#' remain
  chars = chars.split('').map((c) => (c === '#' ? '#' : '.')).join('');

  // Pad or trim to exactly 13 characters
  if (chars.length < MATRIX_COLS) {
    chars = chars.padEnd(MATRIX_COLS, '.');
  } else if (chars.length > MATRIX_COLS) {
    chars = chars.slice(0, MATRIX_COLS);
  }

  return chars;
}

/**
 * Normalizes an array of rows to exactly 8 rows of 13 characters
 */
export function normalizeLayerRows(rowsInput: any): string[] {
  const normalizedRows: string[] = [];
  const rawList = Array.isArray(rowsInput) ? rowsInput : [];

  for (let r = 0; r < MATRIX_ROWS; r++) {
    if (r < rawList.length) {
      normalizedRows.push(normalizeRowString(rawList[r]));
    } else {
      normalizedRows.push('.'.repeat(MATRIX_COLS));
    }
  }

  return normalizedRows;
}

/**
 * Validates and normalizes an animation object
 */
export function normalizeAnimation(anim: any): {
  type: SupportedAnimationType;
  direction?: 'up' | 'down' | 'left' | 'right' | number | string;
  distance?: number;
  phase?: number;
  loop?: boolean;
} {
  if (!anim || typeof anim !== 'object') {
    return { type: 'static' };
  }

  const rawType = String(anim.type || 'static').toLowerCase().trim();
  const matchedType = VALID_ANIMATION_TYPES.find((t) => t === rawType) || 'static';

  const res: any = { type: matchedType };

  if (anim.direction) {
    res.direction = anim.direction;
  }
  if (typeof anim.distance === 'number') {
    res.distance = Math.max(1, Math.min(13, anim.distance));
  }
  if (typeof anim.phase === 'number') {
    res.phase = anim.phase;
  }
  if (typeof anim.loop === 'boolean') {
    res.loop = anim.loop;
  }

  return res;
}

/**
 * Validates and normalizes raw model data into a strict PixelScenePlan
 */
export function validateAndNormalizePixelScene(
  raw: any,
  requestedFrameCount?: number
): { valid: boolean; plan?: PixelScenePlan; errors?: string[] } {
  const errors: string[] = [];

  if (!raw || typeof raw !== 'object') {
    return { valid: false, errors: ['Output is not a valid object'] };
  }

  // Version
  const version = typeof raw.version === 'number' ? raw.version : 1;

  // Title
  const title = typeof raw.title === 'string' && raw.title.trim().length > 0
    ? raw.title.trim().slice(0, 40)
    : 'Custom Pixel Art';

  // Frame count: prioritize user requested frame count, or validate output
  let frameCount = requestedFrameCount || raw.frameCount || 2;
  const allowedCounts = [1, 2, 4, 8, 12, 16];
  if (!allowedCounts.includes(frameCount)) {
    // Find closest allowed count
    frameCount = allowedCounts.reduce((prev, curr) =>
      Math.abs(curr - frameCount) < Math.abs(prev - frameCount) ? curr : prev
    );
  }

  // Frame duration ms
  let frameMs = typeof raw.frameMs === 'number' ? raw.frameMs : 250;
  if (frameMs < 80 || frameMs > 800) {
    frameMs = Math.max(80, Math.min(800, frameMs));
  }

  // Layers (1 to 3 allowed)
  let rawLayers = raw.layers;
  if (!Array.isArray(rawLayers) || rawLayers.length === 0) {
    // Check if raw has a top-level rows array
    if (Array.isArray(raw.rows)) {
      rawLayers = [{ name: 'main', rows: raw.rows, animation: { type: 'static' } }];
    } else {
      errors.push('No layers array provided in plan');
      return { valid: false, errors };
    }
  }

  if (rawLayers.length > 3) {
    // Clamp to 3 layers
    rawLayers = rawLayers.slice(0, 3);
  }

  const normalizedLayers: PixelSceneLayer[] = [];
  let totalOnPixels = 0;

  for (let i = 0; i < rawLayers.length; i++) {
    const l = rawLayers[i];
    const name = typeof l.name === 'string' ? l.name : `layer_${i + 1}`;
    const rows = normalizeLayerRows(l.rows);
    const animation = normalizeAnimation(l.animation);

    // Count on pixels
    for (const r of rows) {
      for (const ch of r) {
        if (ch === '#') totalOnPixels++;
      }
    }

    normalizedLayers.push({
      name,
      rows,
      animation,
    });
  }

  if (totalOnPixels === 0) {
    errors.push('All layers are completely empty');
    return { valid: false, errors };
  }

  const plan: PixelScenePlan = {
    version,
    title,
    frameCount,
    frameMs,
    layers: normalizedLayers,
  };

  return {
    valid: true,
    plan,
  };
}
