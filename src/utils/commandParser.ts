import {
  EffectRecipe,
  MotionEffectType,
  AppearanceEffectType,
  SpeedPreset,
  LoopStyle,
  FrameAnalysis,
} from '../types/animationEffects';

export interface CommandParseResult {
  recipe: EffectRecipe;
  isExplicit: boolean; // true if matched by deterministic parser, false if needs model fallback
  matchedMotion?: MotionEffectType;
  matchedSpeed?: string;
  matchedAppearance: AppearanceEffectType[];
  description: string;
}

/**
 * Deterministically parses natural-language motion commands
 * Bypasses local LLM when explicit motion, direction, speed, or appearance is present
 */
export function parseDeterministicCommand(
  prompt: string,
  analysis?: FrameAnalysis
): CommandParseResult | null {
  const raw = (prompt || '').trim();
  if (!raw) return null;

  // Normalized text for keyword matching: lower-case with normalized whitespace
  const text = ` ${raw.toLowerCase().replace(/[^a-z0-9&'-]/g, ' ').replace(/\s+/g, ' ')} `;

  // 1. DIRECTION AND MOTION (Strict Precedence)
  let motion: MotionEffectType | null = null;

  // Precedence Rule 1: "up and down" must take precedence over individual "up"
  if (
    text.includes(' up and down ') ||
    text.includes(' up & down ') ||
    text.includes(' vertical bounce ') ||
    text.includes(' bob ') ||
    text.includes(' bobbing ') ||
    text.includes(' jump ') ||
    text.includes(' jumping ')
  ) {
    motion = 'bounce-y';
  }
  // Precedence Rule 2: "left and right" must take precedence over individual "left" or "right"
  else if (
    text.includes(' left and right ') ||
    text.includes(' left & right ') ||
    text.includes(' horizontal bounce ')
  ) {
    motion = 'bounce-x';
  }
  // Directional drift / scroll
  else if (
    text.includes(' move left ') ||
    text.includes(' scroll left ') ||
    text.includes(' drift left ') ||
    text.includes(' slide left ')
  ) {
    motion = 'drift-left';
  } else if (
    text.includes(' move right ') ||
    text.includes(' scroll right ') ||
    text.includes(' drift right ') ||
    text.includes(' slide right ')
  ) {
    motion = 'drift-right';
  }
  // Rise / Fall
  else if (
    text.includes(' move up ') ||
    text.includes(' float up ') ||
    text.includes(' float upward ') ||
    text.includes(' float upwards ') ||
    text.includes(' rise ') ||
    text.includes(' rising ')
  ) {
    motion = 'rise';
  } else if (
    text.includes(' move down ') ||
    text.includes(' fall ') ||
    text.includes(' falling ') ||
    text.includes(' drop ') ||
    text.includes(' dropping ')
  ) {
    motion = 'fall';
  }
  // Shake / Jitter / Tremble
  else if (
    text.includes(' shake ') ||
    text.includes(' shaking ') ||
    text.includes(' jitter ') ||
    text.includes(' jittery ') ||
    text.includes(' tremble ') ||
    text.includes(' trembling ')
  ) {
    motion = 'shake';
  }
  // Wave
  else if (
    text.includes(' wave ') ||
    text.includes(' wavy ') ||
    text.includes(' waving ') ||
    text.includes(' ripples ')
  ) {
    motion = 'wave';
  }
  // Static / None
  else if (
    text.includes(' stay still ') ||
    text.includes(" don't move ") ||
    text.includes(' dont move ') ||
    text.includes(' stand still ') ||
    text.includes(' stop moving ') ||
    text.includes(' freeze ') ||
    text.includes(' static ')
  ) {
    motion = 'none';
  }

  // 2. APPEARANCE EFFECTS (Strict Explicit Matching Only)
  // Do not infer appearance effects from subject identity (e.g., lightning does not sparkle, heart does not pulse)
  const appearance: AppearanceEffectType[] = [];

  if (text.includes(' blink ') || text.includes(' blinking ') || text.includes(' flash ') || text.includes(' flashing ')) {
    appearance.push('blink');
  }
  if (text.includes(' pulse ') || text.includes(' pulsing ') || text.includes(' beat ') || text.includes(' beating ') || text.includes(' heartbeat ')) {
    appearance.push('pulse');
  }
  if (text.includes(' sparkle ') || text.includes(' sparkling ') || text.includes(' twinkle ') || text.includes(' twinkling ') || text.includes(' glitter ')) {
    appearance.push('sparkle');
  }
  if (text.includes(' invert ') || text.includes(' inverted ') || text.includes(' inverting ') || text.includes(' negative ')) {
    // blink and alternate/invert are mutually exclusive
    if (!appearance.includes('blink')) {
      appearance.push('alternate');
    }
  }
  if (text.includes(' mirror ') || text.includes(' flip ') || text.includes(' flipping ')) {
    appearance.push('mirror');
  }

  // If neither explicit motion nor explicit appearance is detected, let the model handle semantic interpretation
  if (!motion && appearance.length === 0) {
    return null;
  }

  // Default motion to 'none' if only appearance was specified
  const finalMotion: MotionEffectType = motion || 'none';

  // 3. SPEED (Concrete timings synchronized with labels)
  let speedPreset: SpeedPreset = 'medium';
  let customMs = 180;
  let speedLabel = 'Medium';

  if (text.includes(' very fast ')) {
    speedPreset = 'fast';
    customMs = 70;
    speedLabel = 'Very Fast';
  } else if (text.includes(' fast ') || text.includes(' quick ') || text.includes(' quickly ')) {
    speedPreset = 'fast';
    customMs = 90;
    speedLabel = 'Fast';
  } else if (text.includes(' very slow ')) {
    speedPreset = 'slow';
    customMs = 400;
    speedLabel = 'Very Slow';
  } else if (
    text.includes(' slow ') ||
    text.includes(' slowly ') ||
    text.includes(' gentle ') ||
    text.includes(' gently ')
  ) {
    speedPreset = 'slow';
    customMs = 280;
    speedLabel = 'Slow';
  } else {
    speedPreset = 'medium';
    customMs = 180;
    speedLabel = 'Medium';
  }

  // 4. DISTANCE (Pixel distance per frame)
  let distance = 1;
  if (
    text.includes(' 3 px ') ||
    text.includes(' 3px ') ||
    text.includes(' 3 pixels ') ||
    text.includes(' 3 pixel ')
  ) {
    distance = 3;
  } else if (
    text.includes(' 2 px ') ||
    text.includes(' 2px ') ||
    text.includes(' 2 pixels ') ||
    text.includes(' 2 pixel ') ||
    text.includes(' more ') ||
    text.includes(' big movement ') ||
    text.includes(' bigger ') ||
    text.includes(' farther ') ||
    text.includes(' further ') ||
    text.includes(' wide ')
  ) {
    distance = 2;
  } else {
    // “slightly,” “subtle,” or no distance specified → 1 pixel per frame
    distance = 1;
  }

  // Never choose a distance that moves artwork outside canvas unless wrapping was explicitly requested
  const explicitWrap = text.includes(' wrap ') || text.includes(' wrapping ') || text.includes(' across ');
  if (analysis && !explicitWrap) {
    if (finalMotion === 'bounce-x') {
      const maxPaddingX = Math.min(analysis.freeLeft, analysis.freeRight);
      distance = Math.max(1, Math.min(distance, maxPaddingX > 0 ? maxPaddingX : 1));
    } else if (finalMotion === 'bounce-y') {
      const maxPaddingY = Math.min(analysis.freeTop, analysis.freeBottom);
      distance = Math.max(1, Math.min(distance, maxPaddingY > 0 ? maxPaddingY : 1));
    } else if (finalMotion === 'rise') {
      distance = Math.max(1, Math.min(distance, analysis.freeTop > 0 ? analysis.freeTop : 1));
    } else if (finalMotion === 'fall') {
      distance = Math.max(1, Math.min(distance, analysis.freeBottom > 0 ? analysis.freeBottom : 1));
    }
  }

  // 5. FRAME COUNT
  // - 4 frames by default for directional motion
  // - 2 frames for simple blink, invert, or mirror
  // - 8 frames for smooth scrolling or explicit smooth request
  // - Never automatically select 12 or 16 frames
  let frameCount: 2 | 4 | 8 | 12 | 16 = 4;

  if (text.includes(' 2 frames ') || text.includes(' two frames ')) {
    frameCount = 2;
  } else if (text.includes(' 8 frames ') || text.includes(' eight frames ') || text.includes(' smooth ') || text.includes(' smoother ')) {
    frameCount = 8;
  } else if (finalMotion === 'none' && (appearance.includes('blink') || appearance.includes('alternate') || appearance.includes('mirror'))) {
    frameCount = 2;
  } else if (finalMotion === 'drift-left' || finalMotion === 'drift-right') {
    frameCount = explicitWrap ? 8 : 4;
  } else {
    frameCount = 4;
  }

  // 6. WRAP & LOOP
  let wrap = false;
  let loop: LoopStyle = 'ping-pong';

  if (finalMotion === 'bounce-x' || finalMotion === 'bounce-y') {
    wrap = false;
    loop = 'ping-pong';
  } else if (finalMotion === 'drift-left' || finalMotion === 'drift-right') {
    wrap = true;
    loop = 'seamless';
  } else if (finalMotion === 'rise' || finalMotion === 'fall') {
    wrap = explicitWrap;
    loop = text.includes('ping-pong') || text.includes('bounce') ? 'ping-pong' : 'seamless';
  } else if (finalMotion === 'shake') {
    wrap = false;
    loop = 'ping-pong';
  } else if (finalMotion === 'wave') {
    wrap = true;
    loop = 'seamless';
  } else {
    wrap = false;
    loop = 'seamless';
  }

  const recipe: EffectRecipe = {
    motion: finalMotion,
    appearance,
    distance,
    frameCount,
    speed: speedPreset,
    customMs,
    wrap,
    loop,
  };

  return {
    recipe,
    isExplicit: true,
    matchedMotion: finalMotion,
    matchedSpeed: speedLabel,
    matchedAppearance: appearance,
    description: `Parsed from explicit command: ${finalMotion} at ${customMs}ms`,
  };
}
