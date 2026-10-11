import {
  EffectRecipe,
  MotionEffectType,
  AppearanceEffectType,
  SpeedPreset,
  LoopStyle,
  ModelProgressInfo,
  FrameAnalysis,
} from '../types/animationEffects';
import { extractJsonFromText } from '../utils/outputExtractor';
import { parseDeterministicCommand } from '../utils/commandParser';

type StatusListener = (info: ModelProgressInfo) => void;

class LocalCopilotService {
  private worker: Worker | null = null;
  private statusListeners: Set<StatusListener> = new Set();
  private currentStatus: ModelProgressInfo = {
    status: 'unloaded',
    message: 'Model not loaded',
  };
  private loadedDevice: 'webgpu' | 'cpu' | null = null;
  private pendingRequestId = 0;
  private activeReject: ((reason?: any) => void) | null = null;

  constructor() {
    // Lazy worker initialization
  }

  private initWorker(): Worker | null {
    if (this.worker) return this.worker;

    try {
      this.worker = new Worker(
        new URL('../workers/modelWorker.ts', import.meta.url),
        { type: 'module' }
      );

      this.worker.onmessage = (e: MessageEvent) => {
        this.handleWorkerMessage(e.data);
      };

      this.worker.onerror = (err) => {
        console.warn('Worker error:', err);
        this.updateStatus({
          status: 'error',
          message: 'Local worker error',
          errorDetails: err.message,
        });
      };
    } catch (e: any) {
      console.warn('Could not spawn Web Worker:', e);
      return null;
    }

    return this.worker;
  }

  public subscribe(listener: StatusListener): () => void {
    this.statusListeners.add(listener);
    listener(this.currentStatus);
    return () => {
      this.statusListeners.delete(listener);
    };
  }

  public getStatus(): ModelProgressInfo {
    return this.currentStatus;
  }

  private updateStatus(info: ModelProgressInfo) {
    this.currentStatus = info;
    if (info.status === 'ready-webgpu') {
      this.loadedDevice = 'webgpu';
    } else if (info.status === 'ready-cpu') {
      this.loadedDevice = 'cpu';
    }
    for (const listener of this.statusListeners) {
      listener(info);
    }
  }

  private restoreReadyStatus() {
    if (this.loadedDevice === 'webgpu') {
      this.updateStatus({
        status: 'ready-webgpu',
        message: 'Ready on WebGPU',
        device: 'webgpu',
      });
    } else if (this.loadedDevice === 'cpu') {
      this.updateStatus({
        status: 'ready-cpu',
        message: 'Ready on CPU',
        device: 'cpu',
      });
    } else {
      this.updateStatus({
        status: 'unloaded',
        message: 'Model not loaded',
      });
    }
  }

  private handleWorkerMessage(data: any) {
    if (data.type === 'STATUS') {
      this.updateStatus({
        status: data.status,
        progressPercent: data.progressPercent,
        message: data.message,
        device: data.device || this.currentStatus.device,
        errorDetails: data.errorDetails,
      });
    }
  }

  public preloadModel() {
    const worker = this.initWorker();
    if (worker && this.currentStatus.status === 'unloaded') {
      worker.postMessage({ type: 'PRELOAD' });
    }
  }

  public cancelCurrent() {
    if (this.worker) {
      this.worker.postMessage({ type: 'ABORT' });
    }
    if (this.activeReject) {
      this.activeReject(new Error('Suggestion cancelled'));
      this.activeReject = null;
    }
    this.restoreReadyStatus();
  }

  /**
   * Fast rule-based heuristic for common intent phrases
   * Works instantly without waiting for model download
   */
  public detectHeuristicRecipe(userPrompt: string): Partial<EffectRecipe> | null {
    const p = (userPrompt || '').toLowerCase().trim();
    if (!p) return null;

    if (p.includes('nervous') || p.includes('tremble') || p.includes('jitter')) {
      return { motion: 'shake', distance: 1, speed: 'fast', frameCount: 8, loop: 'ping-pong' };
    }
    if (p.includes('beat') || p.includes('heartbeat') || p.includes('gently') || p.includes('pulse')) {
      return { motion: 'none', appearance: ['pulse'], distance: 1, speed: 'slow', frameCount: 4 };
    }
    if (p.includes('float upward') || p.includes('rise') || p.includes('lift')) {
      return { motion: 'rise', distance: 2, speed: 'medium', wrap: true, loop: 'seamless', frameCount: 8 };
    }
    if (p.includes('sparkle') && p.includes('bounce')) {
      return { motion: 'bounce-y', appearance: ['sparkle'], distance: 1, speed: 'medium', frameCount: 4 };
    }
    if (p.includes('scroll') || p.includes('across') || p.includes('drift')) {
      return { motion: 'drift-left', distance: 2, speed: 'medium', wrap: true, frameCount: 8 };
    }
    if (p.includes('blink') || p.includes('wink')) {
      return { motion: 'none', appearance: ['blink'], speed: 'medium', frameCount: 2 };
    }
    if (p.includes('wave') || p.includes('swim') || p.includes('flag')) {
      return { motion: 'wave', distance: 1, speed: 'medium', frameCount: 4 };
    }

    return null;
  }

  /**
   * Translates user natural language into an effect recipe
   * Uses deterministic parsing first; invokes local model only if parsing cannot identify a clear effect
   */
  public async suggestEffects(
    userPrompt: string,
    frameAnalysis?: FrameAnalysis
  ): Promise<{ recipe: Partial<EffectRecipe>; source: 'ai' | 'heuristic' }> {
    const trimmed = (userPrompt || '').trim();
    if (!trimmed) {
      throw new Error('Suggestion prompt cannot be empty');
    }

    // 1. FAST DETERMINISTIC COMMAND PARSER (Bypasses model completely when explicit)
    const deterministic = parseDeterministicCommand(trimmed, frameAnalysis);
    if (deterministic) {
      return { recipe: deterministic.recipe, source: 'heuristic' };
    }

    // Fast heuristic fallback for implicit words
    const heuristic = this.detectHeuristicRecipe(trimmed) || {
      motion: 'bounce-y',
      appearance: [],
      distance: 1,
      speed: 'medium',
      frameCount: 4,
      wrap: false,
      loop: 'ping-pong',
    };

    const worker = this.initWorker();
    // If worker cannot load or model is unloaded, return heuristic immediately
    if (!worker || this.currentStatus.status === 'unloaded') {
      this.preloadModel();
      return { recipe: heuristic, source: 'heuristic' };
    }

    this.updateStatus({
      status: 'generating',
      message: 'Recommending effect recipe...',
      device: this.loadedDevice || undefined,
    });

    const requestId = ++this.pendingRequestId;
    const isDev = Boolean(import.meta.env?.DEV);

    return new Promise<{ recipe: Partial<EffectRecipe>; source: 'ai' | 'heuristic' }>((resolve) => {
      let timeoutTimer: any = null;

      const cleanup = () => {
        if (timeoutTimer) clearTimeout(timeoutTimer);
        worker.removeEventListener('message', messageHandler);
        this.activeReject = null;
        this.restoreReadyStatus();
      };

      const messageHandler = (e: MessageEvent) => {
        const data = e.data;
        if (data.id !== requestId) return;

        if (data.type === 'CANCELLED') {
          cleanup();
          resolve({ recipe: heuristic, source: 'heuristic' });
          return;
        }

        if (data.type === 'SUGGEST_SUCCESS') {
          cleanup();
          try {
            const rawJson = extractJsonFromText(data.rawText);
            const validated = this.validateAndNormalizeRecipe(rawJson);

            if (isDev) {
              console.log('[Local Copilot AI Suggestion]:', rawJson, 'Validated:', validated);
            }

            resolve({ recipe: validated, source: 'ai' });
            return;
          } catch (err) {
            if (isDev) {
              console.warn('[Local Copilot] Failed to parse suggestion JSON:', data.rawText, err);
            }
            resolve({ recipe: heuristic, source: 'heuristic' });
            return;
          }
        }

        if (data.type === 'SUGGEST_ERROR') {
          cleanup();
          resolve({ recipe: heuristic, source: 'heuristic' });
          return;
        }
      };

      worker.addEventListener('message', messageHandler);

      // Max 6-second timeout for AI suggestions
      timeoutTimer = setTimeout(() => {
        cleanup();
        if (isDev) {
          console.warn('[Local Copilot] AI suggestion timed out; using heuristic.');
        }
        resolve({ recipe: heuristic, source: 'heuristic' });
      }, 6000);

      worker.postMessage({
        id: requestId,
        type: 'SUGGEST_RECIPE',
        payload: { userPrompt: trimmed },
      });
    });
  }

  /**
   * Normalizes model JSON into strict visible effect enums
   */
  public validateAndNormalizeRecipe(raw: any): Partial<EffectRecipe> {
    const validMotions: MotionEffectType[] = [
      'none',
      'bounce-x',
      'bounce-y',
      'drift-left',
      'drift-right',
      'rise',
      'fall',
      'shake',
      'wave',
    ];
    const validAppearance: AppearanceEffectType[] = [
      'blink',
      'pulse',
      'sparkle',
      'alternate',
      'mirror',
    ];

    const result: Partial<EffectRecipe> = {};

    // Motion
    const rawMotion = String(raw?.motion || '').toLowerCase().trim();
    if (validMotions.includes(rawMotion as MotionEffectType)) {
      result.motion = rawMotion as MotionEffectType;
    } else if (rawMotion.includes('shake')) {
      result.motion = 'shake';
    } else if (rawMotion.includes('rise')) {
      result.motion = 'rise';
    } else if (rawMotion.includes('fall')) {
      result.motion = 'fall';
    } else if (rawMotion.includes('wave')) {
      result.motion = 'wave';
    } else if (rawMotion.includes('bounce')) {
      result.motion = rawMotion.includes('x') ? 'bounce-x' : 'bounce-y';
    } else if (rawMotion.includes('drift')) {
      result.motion = rawMotion.includes('right') ? 'drift-right' : 'drift-left';
    }

    // Appearance
    if (Array.isArray(raw?.appearance)) {
      result.appearance = raw.appearance
        .map((a: any) => String(a).toLowerCase().trim())
        .filter((a: string) => validAppearance.includes(a as AppearanceEffectType));
    } else if (typeof raw?.appearance === 'string') {
      const appStr = raw.appearance.toLowerCase().trim();
      if (appStr === 'none' || appStr === 'no') {
        result.appearance = [];
      } else if (validAppearance.includes(appStr as AppearanceEffectType)) {
        result.appearance = [appStr as AppearanceEffectType];
      }
    }

    // Frame count (2, 4, 8, 12, 16)
    const allowedFrames: (2 | 4 | 8 | 12 | 16)[] = [2, 4, 8, 12, 16];
    if (typeof raw?.frameCount === 'number' && allowedFrames.includes(raw.frameCount as any)) {
      result.frameCount = raw.frameCount;
    }

    // Distance (1 - 3)
    if (typeof raw?.distance === 'number') {
      result.distance = Math.max(1, Math.min(3, Math.round(raw.distance)));
    }

    // Speed ('slow' | 'medium' | 'fast')
    const rawSpeed = String(raw?.speed || '').toLowerCase().trim();
    if (['slow', 'medium', 'fast'].includes(rawSpeed)) {
      result.speed = rawSpeed as SpeedPreset;
    }

    // Wrap
    if (typeof raw?.wrap === 'boolean') {
      result.wrap = raw.wrap;
    }

    // Loop
    const rawLoop = String(raw?.loop || '').toLowerCase().trim();
    if (['seamless', 'ping-pong'].includes(rawLoop)) {
      result.loop = rawLoop as LoopStyle;
    }

    return result;
  }
}

export const localCopilotService = new LocalCopilotService();
