export type SemanticMotion =
  | 'static'
  | 'blink'
  | 'pulse'
  | 'bounce'
  | 'drift-left'
  | 'drift-right'
  | 'rise'
  | 'wave'
  | 'alternate';

export type SemanticSpeed = 'slow' | 'medium' | 'fast';

export interface SemanticAnimationPlan {
  subject: string;
  motion: SemanticMotion;
  speed: SemanticSpeed;
  variant: number;
}

export type SupportedAnimationType =
  | 'static'
  | 'blink'
  | 'bounce-x'
  | 'bounce-y'
  | 'drift-x'
  | 'drift-y'
  | 'rise-and-fade'
  | 'pulse'
  | 'alternate'
  | 'wave'
  | 'orbit'
  | 'ping-pong';

export interface PixelSceneAnimation {
  type: SupportedAnimationType;
  direction?: 'up' | 'down' | 'left' | 'right' | number | string;
  distance?: number;
  phase?: number;
  loop?: boolean;
  rate?: number;
}

export interface PixelSceneLayer {
  name: string;
  rows: string[];
  animation?: PixelSceneAnimation;
}

export interface PixelScenePlan {
  version: number;
  title: string;
  frameCount: number;
  frameMs: number;
  layers: PixelSceneLayer[];
}

export interface GenerationResult {
  title: string;
  description: string;
  frames: number[][][]; // shape: [frameCount][8][13]
  frameDelayMs: number;
  source: 'fast-path' | 'on-device-model' | 'local-fallback';
  device?: 'webgpu' | 'cpu';
  rawPlan?: SemanticAnimationPlan | PixelScenePlan;
  notice?: string;
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
