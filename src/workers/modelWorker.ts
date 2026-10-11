import { pipeline, env } from '@huggingface/transformers';
import { extractTextFromPipelineOutput } from '../utils/outputExtractor';

// Configure transformers environment for browser execution
env.allowLocalModels = false;
env.useBrowserCache = true;

const MODEL_ID = 'onnx-community/SmolLM2-135M-Instruct-ONNX-MHA';

let generator: any = null;
let activeDevice: 'webgpu' | 'cpu' = 'cpu';
let isInitializing = false;
let abortRequested = false;

// Concise effect recipe instruction as specified
const SYSTEM_PROMPT = `Choose animation controls for an existing pixel drawing.
Do not redesign the drawing.
Return one primary motion and only appearance effects explicitly implied by the request.
Prefer the fewest effects necessary.
Return JSON only.
Valid motion: "none", "bounce-x", "bounce-y", "drift-left", "drift-right", "rise", "fall", "shake", "wave"
Valid appearance: ["blink"], ["pulse"], ["sparkle"], ["alternate"], ["mirror"] or []
Format: {"motion":"...","appearance":[],"distance":1,"frameCount":4,"speed":"medium","wrap":false,"loop":"ping-pong"}`;

async function initModel(): Promise<any> {
  if (generator) return generator;
  if (isInitializing) {
    while (isInitializing) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    if (generator) return generator;
  }

  isInitializing = true;
  self.postMessage({ type: 'STATUS', status: 'downloading', message: 'Downloading local model: 0%' });

  // Progress tracking
  const fileProgress: Record<string, number> = {};
  const onProgress = (p: any) => {
    if (p.file) {
      if (typeof p.progress === 'number') {
        fileProgress[p.file] = p.progress;
      } else if (p.status === 'done') {
        fileProgress[p.file] = 100;
      }
      const files = Object.values(fileProgress);
      const avg = files.length > 0
        ? Math.round(files.reduce((a, b) => a + b, 0) / files.length)
        : 0;
      self.postMessage({
        type: 'STATUS',
        status: 'downloading',
        progressPercent: avg,
        message: `Downloading local model: ${avg}%`,
      });
    } else if (p.status === 'ready') {
      self.postMessage({ type: 'STATUS', status: 'preparing', message: 'Preparing model' });
    }
  };

  const hasWebGPU = typeof navigator !== 'undefined' && 'gpu' in navigator;

  if (hasWebGPU) {
    try {
      generator = await pipeline('text-generation', MODEL_ID, {
        device: 'webgpu',
        dtype: 'q4',
        progress_callback: onProgress,
      });
      activeDevice = 'webgpu';
      isInitializing = false;
      self.postMessage({
        type: 'STATUS',
        status: 'ready-webgpu',
        device: 'webgpu',
        message: 'Ready on WebGPU',
      });
      return generator;
    } catch (gpuErr: any) {
      console.warn('WebGPU failed, attempting WASM/CPU fallback:', gpuErr);
    }
  }

  // Graceful WASM/CPU fallback
  try {
    self.postMessage({ type: 'STATUS', status: 'preparing', message: 'Preparing model (CPU mode)' });
    generator = await pipeline('text-generation', MODEL_ID, {
      device: 'wasm',
      dtype: 'q4',
      progress_callback: onProgress,
    });
    activeDevice = 'cpu';
    isInitializing = false;
    self.postMessage({
      type: 'STATUS',
      status: 'ready-cpu',
      device: 'cpu',
      message: 'Ready on CPU',
    });
    return generator;
  } catch (wasmErr: any) {
    isInitializing = false;
    self.postMessage({
      type: 'STATUS',
      status: 'error',
      message: 'Could not load local model',
      errorDetails: wasmErr?.message || String(wasmErr),
    });
    throw wasmErr;
  }
}

self.onmessage = async (e: MessageEvent) => {
  const { id, type, payload } = e.data;

  if (type === 'PRELOAD') {
    try {
      await initModel();
      self.postMessage({ id, type: 'PRELOAD_SUCCESS', device: activeDevice });
    } catch (err: any) {
      self.postMessage({ id, type: 'PRELOAD_ERROR', error: err?.message || 'Preload failed' });
    }
    return;
  }

  if (type === 'ABORT') {
    abortRequested = true;
    return;
  }

  if (type === 'SUGGEST_RECIPE') {
    abortRequested = false;
    const { userPrompt, frameSummary } = payload;

    try {
      self.postMessage({
        type: 'STATUS',
        status: 'generating',
        message: 'Recommending effect recipe...',
      });

      const gen = await initModel();

      if (abortRequested) {
        self.postMessage({ id, type: 'CANCELLED' });
        return;
      }

      // Pass only the user's intent prompt without bitmap or frameSummary
      const messages = [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt.trim() },
      ];

      // Limit to 48 new tokens for super-fast effect recommendation
      const output = await gen(messages, {
        max_new_tokens: 48,
        temperature: 0.1,
        do_sample: false,
        return_full_text: false,
      });

      if (abortRequested) {
        self.postMessage({ id, type: 'CANCELLED' });
        return;
      }

      const rawText = extractTextFromPipelineOutput(output);

      self.postMessage({
        id,
        type: 'SUGGEST_SUCCESS',
        rawText,
        device: activeDevice,
      });
    } catch (err: any) {
      self.postMessage({
        id,
        type: 'SUGGEST_ERROR',
        error: err?.message || 'Suggestion error',
      });
    }
  }
};
