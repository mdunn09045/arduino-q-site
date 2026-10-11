export type MotionEffectType =
  | 'none'
  | 'bounce-x'
  | 'bounce-y'
  | 'drift-left'
  | 'drift-right'
  | 'rise'
  | 'fall'
  | 'shake'
  | 'wave';

export type AppearanceEffectType =
  | 'blink'
  | 'pulse'
  | 'sparkle'
  | 'alternate'
  | 'mirror';

export type SpeedPreset = 'slow' | 'medium' | 'fast' | 'custom';
export type LoopStyle = 'seamless' | 'ping-pong';

export interface EffectRecipe {
  motion: MotionEffectType;
  distance: number; // pixel distance per frame (1 - 3)
  wrap: boolean;
  loop: LoopStyle;
  appearance: AppearanceEffectType[];
  frameCount: 2 | 4 | 8 | 12 | 16;
  speed: SpeedPreset;
  customMs?: number;
}

export interface FrameAnalysis {
  litCount: number;
  minRow: number;
  maxRow: number;
  minCol: number;
  maxCol: number;
  freeTop: number;
  freeBottom: number;
  freeLeft: number;
  freeRight: number;
  isHorizSymmetric: boolean;
  isVertSymmetric: boolean;
  touchesEdge: boolean;
  isBlank: boolean;
  isFull: boolean;
  summary: string;
}

export interface SuggestionResult {
  recipe: Partial<EffectRecipe>;
  rationale?: string;
  source: 'ai' | 'heuristic';
}

export type ModelWorkerStatus =
  | 'unloaded'
  | 'downloading'
  | 'preparing'
  | 'ready-webgpu'
  | 'ready-cpu'
  | 'generating'
  | 'error';

export interface ModelProgressInfo {
  status: ModelWorkerStatus;
  progressPercent?: number;
  message: string;
  device?: 'webgpu' | 'cpu';
  errorDetails?: string;
}
