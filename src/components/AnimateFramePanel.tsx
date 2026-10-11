import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Wand2,
  Sparkles,
  Play,
  RotateCcw,
  Check,
  AlertTriangle,
  Info,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Eye,
  Layers,
  Cpu,
  RefreshCw,
  Zap,
  ShieldCheck,
  ExternalLink,
} from 'lucide-react';
import { Frame } from '../types';
import {
  EffectRecipe,
  MotionEffectType,
  AppearanceEffectType,
  SpeedPreset,
  LoopStyle,
  ModelProgressInfo,
} from '../types/animationEffects';
import { analyzeFrame, MATRIX_ROWS, MATRIX_COLS } from '../utils/frameAnalysis';
import {
  generateAnimationFromFrame,
  speedToDelayMs,
} from '../utils/frameAnimationEngine';
import { localCopilotService } from '../services/localCopilotService';
import { PRESET_ARTS } from '../utils/presets';

interface AnimateFramePanelProps {
  currentFrame: Frame;
  onApplyAnimation: (
    frames: Frame[],
    delayMs: number,
    title?: string,
    description?: string
  ) => void;
  onRestoreSourceFrame?: (matrix: number[][]) => void;
}

const MOTION_OPTIONS: { id: MotionEffectType; label: string; desc: string }[] = [
  { id: 'none', label: 'None', desc: 'No movement' },
  { id: 'bounce-x', label: 'Bounce Horiz', desc: 'Left & right ping-pong' },
  { id: 'bounce-y', label: 'Bounce Vert', desc: 'Up & down ping-pong' },
  { id: 'drift-left', label: 'Drift Left', desc: 'Scrolls to the left' },
  { id: 'drift-right', label: 'Drift Right', desc: 'Scrolls to the right' },
  { id: 'rise', label: 'Rise', desc: 'Floats upward' },
  { id: 'fall', label: 'Fall', desc: 'Drifts downward' },
  { id: 'shake', label: 'Shake', desc: 'Jitter & nervous tremor' },
  { id: 'wave', label: 'Wave', desc: 'Row-by-row fluid ripples' },
];

const APPEARANCE_OPTIONS: {
  id: AppearanceEffectType | 'none';
  label: string;
  desc: string;
  warning?: string;
}[] = [
  {
    id: 'none',
    label: 'None',
    desc: 'Clean motion only — pure path with no overlays or flashing',
  },
  { id: 'pulse', label: 'Pulse', desc: 'Gentle heartbeat dilation' },
  { id: 'blink', label: 'Blink', desc: 'Alternates with blank canvas' },
  { id: 'sparkle', label: 'Sparkle', desc: 'Deterministic twinkling accents' },
  {
    id: 'alternate',
    label: 'Alternate / Invert',
    desc: 'Inverts all 104 LEDs on alternate frames',
    warning: 'Caution: Inverts almost all LEDs',
  },
  { id: 'mirror', label: 'Mirror Flip', desc: 'Horizontally flips alternate frames' },
];

const AI_SUGGESTION_PROMPTS = [
  'bounce up and down fast',
  'shake slightly',
  'float upward',
  'drift left',
  'wave',
];

const formatMotionLabel = (m: MotionEffectType): string => {
  switch (m) {
    case 'bounce-y':
      return 'Vertical bounce';
    case 'bounce-x':
      return 'Horizontal bounce';
    case 'rise':
      return 'Rise';
    case 'fall':
      return 'Fall';
    case 'drift-left':
      return 'Drift left';
    case 'drift-right':
      return 'Drift right';
    case 'shake':
      return 'Shake';
    case 'wave':
      return 'Wave';
    case 'none':
      return 'None';
    default:
      return m;
  }
};

const formatSpeedLabel = (s: SpeedPreset, customMs?: number): string => {
  if (customMs === 70) return 'Very Fast (70ms)';
  if (customMs === 90) return 'Fast (90ms)';
  if (customMs === 280) return 'Slow (280ms)';
  if (customMs === 400) return 'Very Slow (400ms)';
  switch (s) {
    case 'fast':
      return 'Fast (90ms)';
    case 'slow':
      return 'Slow (280ms)';
    case 'medium':
      return 'Medium (180ms)';
    case 'custom':
      return `Custom (${customMs || 180}ms)`;
    default:
      return 'Medium (180ms)';
  }
};

const formatLoopLabel = (l: LoopStyle): string => {
  return l === 'ping-pong' ? 'Ping-pong' : 'Seamless continuous';
};

const formatAppearanceLabel = (app: AppearanceEffectType[]): string => {
  if (!app || app.length === 0) return 'None';
  return app
    .map((a) => {
      switch (a) {
        case 'blink':
          return 'Blink';
        case 'pulse':
          return 'Pulse';
        case 'sparkle':
          return 'Sparkle';
        case 'alternate':
          return 'Alternate / Invert';
        case 'mirror':
          return 'Mirror flip';
        default:
          return a;
      }
    })
    .join(', ');
};

export const AnimateFramePanel: React.FC<AnimateFramePanelProps> = ({
  currentFrame,
  onApplyAnimation,
  onRestoreSourceFrame,
}) => {
  // Immutable source snapshot: stores the initial frame when user starts or draws
  const [sourceSnapshot, setSourceSnapshot] = useState<number[][]>(() =>
    currentFrame.matrix.map((row) => [...row])
  );

  // Active effect recipe state - default appearance is clean 'None' ([])
  const [motion, setMotion] = useState<MotionEffectType>('bounce-y');
  const [distance, setDistance] = useState<number>(1);
  const [wrap, setWrap] = useState<boolean>(true);
  const [loop, setLoop] = useState<LoopStyle>('ping-pong');
  const [appearance, setAppearance] = useState<AppearanceEffectType[]>([]);
  const [frameCount, setFrameCount] = useState<2 | 4 | 8 | 12 | 16>(4);
  const [speed, setSpeed] = useState<SpeedPreset>('medium');
  const [customMs, setCustomMs] = useState<number>(180);

  // Preview / generation states
  const [isPreviewing, setIsPreviewing] = useState<boolean>(false);
  const [previewFrameIndex, setPreviewFrameIndex] = useState<number>(0);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);

  // Expandable "How Local AI Works" accordion state
  const [isExplainAiOpen, setIsExplainAiOpen] = useState<boolean>(false);

  // Optional AI suggestion state
  const [aiPrompt, setAiPrompt] = useState<string>('');
  const [isSuggestingAi, setIsSuggestingAi] = useState<boolean>(false);
  const [aiErrorNotice, setAiErrorNotice] = useState<string | null>(null);
  const [modelStatus, setModelStatus] = useState<ModelProgressInfo>(
    localCopilotService.getStatus()
  );

  // Pending Recommendation preview (does not modify current animation until Apply is selected)
  const [pendingRecommendation, setPendingRecommendation] = useState<{
    recipe: EffectRecipe;
    source: 'ai' | 'heuristic';
    rawPrompt: string;
  } | null>(null);

  // Keep track of signatures of frames generated by this panel
  // so we don't accidentally overwrite the user's initial drawn source frame
  const generatedSignaturesRef = useRef<Set<string>>(new Set());

  // String signature of current editor frame matrix
  const currentMatrixSignature = useMemo(() => {
    return currentFrame.matrix.map((row) => row.join('')).join('');
  }, [currentFrame.matrix]);

  // Synchronize source snapshot whenever user edits or paints in the canvas editor
  useEffect(() => {
    // If the active matrix is one of our newly generated animation frames, don't overwrite user's original source
    if (generatedSignaturesRef.current.has(currentMatrixSignature)) {
      return;
    }
    // Otherwise, the user painted pixels, cleared, inverted, or loaded a frame into the editor!
    setSourceSnapshot(currentFrame.matrix.map((row) => [...row]));
  }, [currentMatrixSignature]);

  // Subscribe to model worker status
  useEffect(() => {
    const unsub = localCopilotService.subscribe((info) => {
      setModelStatus(info);
    });
    return unsub;
  }, []);

  // Analyze the source frame deterministically
  const analysis = useMemo(() => {
    return analyzeFrame(sourceSnapshot);
  }, [sourceSnapshot]);

  // Current active recipe
  const recipe: EffectRecipe = useMemo(() => {
    return {
      motion,
      distance,
      wrap,
      loop,
      appearance,
      frameCount,
      speed,
      customMs,
    };
  }, [motion, distance, wrap, loop, appearance, frameCount, speed, customMs]);

  // Live generated frames from the immutable source frame
  const generatedFramesMatrix = useMemo(() => {
    return generateAnimationFromFrame(sourceSnapshot, recipe);
  }, [sourceSnapshot, recipe]);

  const delayMs = useMemo(() => {
    return speedToDelayMs(speed, customMs);
  }, [speed, customMs]);

  // Live in-panel preview loop
  useEffect(() => {
    if (!isPreviewing || generatedFramesMatrix.length <= 1) return;
    const timer = setInterval(() => {
      setPreviewFrameIndex((prev) => (prev + 1) % generatedFramesMatrix.length);
    }, delayMs);
    return () => clearInterval(timer);
  }, [isPreviewing, generatedFramesMatrix.length, delayMs]);

  // Toggle appearance effect with mutual exclusion rules
  const toggleAppearance = (effect: AppearanceEffectType | 'none') => {
    if (effect === 'none') {
      setAppearance([]);
      return;
    }

    setAppearance((prev) => {
      if (prev.includes(effect)) {
        return prev.filter((e) => e !== effect);
      }
      // Mutually exclusive: cannot select blink and alternate simultaneously
      if (effect === 'blink') {
        return [...prev.filter((e) => e !== 'alternate'), 'blink'];
      }
      if (effect === 'alternate') {
        return [...prev.filter((e) => e !== 'blink'), 'alternate'];
      }
      return [...prev, effect];
    });
  };

  // Generate & commit animation
  const handleGenerateAnimation = () => {
    // Record signatures of the generated frames so we preserve the pristine source frame
    const newSignatures = new Set<string>();
    const newFrames: Frame[] = generatedFramesMatrix.map((matrix, idx) => {
      newSignatures.add(matrix.map((row) => row.join('')).join(''));
      return {
        id: `anim-${Date.now()}-${idx}`,
        matrix,
      };
    });

    generatedSignaturesRef.current = newSignatures;

    onApplyAnimation(
      newFrames,
      delayMs,
      `Animated (${motion !== 'none' ? motion : appearance.length > 0 ? appearance.join('+') : 'Static'})`,
      `Generated from 13×8 source frame using ${recipe.frameCount} frames at ${delayMs}ms`
    );

    setNoticeMessage(`Generated ${recipe.frameCount} frames seamlessly (${delayMs}ms)`);
    setTimeout(() => setNoticeMessage(null), 3000);
  };

  // Explicit sync from canvas editor
  const handleSyncFromCanvas = () => {
    generatedSignaturesRef.current.clear();
    setSourceSnapshot(currentFrame.matrix.map((row) => [...row]));
    setNoticeMessage(`Source frame synced with canvas drawing (${analysis.litCount} lit LEDs)`);
    setTimeout(() => setNoticeMessage(null), 2500);
  };

  // Reset effects to neutral defaults
  const handleResetEffects = () => {
    setMotion('none');
    setDistance(1);
    setWrap(true);
    setLoop('seamless');
    setAppearance([]);
    setFrameCount(4);
    setSpeed('medium');
    setCustomMs(180);
    setNoticeMessage('Effects reset to defaults');
    setTimeout(() => setNoticeMessage(null), 2000);
  };

  // Restore the original source frame
  const handleRestoreSource = () => {
    if (onRestoreSourceFrame) {
      generatedSignaturesRef.current.clear();
      onRestoreSourceFrame(sourceSnapshot);
      setNoticeMessage('Single source frame restored in editor');
      setTimeout(() => setNoticeMessage(null), 2000);
    }
  };

  // AI / Deterministic Suggestion Handler
  const handleSuggestAi = async (promptText?: string) => {
    const target = promptText || aiPrompt;
    if (!target.trim() || isSuggestingAi) return;

    setIsSuggestingAi(true);
    setAiErrorNotice(null);

    try {
      const result = await localCopilotService.suggestEffects(target, analysis);
      const rec = result.recipe;

      const completeRecipe: EffectRecipe = {
        motion: rec.motion || 'bounce-y',
        appearance: rec.appearance || [],
        distance: rec.distance ?? 1,
        frameCount: rec.frameCount ?? 4,
        speed: rec.speed || 'medium',
        customMs:
          rec.customMs ??
          (rec.speed === 'fast' ? 90 : rec.speed === 'slow' ? 280 : 180),
        wrap: Boolean(rec.wrap),
        loop: rec.loop || 'ping-pong',
      };

      // Show recommendation preview first! Does not modify current animation until Apply is selected.
      setPendingRecommendation({
        recipe: completeRecipe,
        source: result.source,
        rawPrompt: target,
      });
    } catch {
      setAiErrorNotice("Couldn't interpret that suggestion. Choose effects manually below.");
    } finally {
      setIsSuggestingAi(false);
    }
  };

  // Apply recommendation to active animation settings
  const handleApplyRecommendation = () => {
    if (!pendingRecommendation) return;
    const { recipe: rec } = pendingRecommendation;

    setMotion(rec.motion);
    setDistance(rec.distance);
    setAppearance(rec.appearance);
    setFrameCount(rec.frameCount);
    setSpeed(rec.speed);
    if (typeof rec.customMs === 'number') {
      setCustomMs(rec.customMs);
    }
    setWrap(rec.wrap);
    setLoop(rec.loop);

    setPendingRecommendation(null);
    setNoticeMessage(`Applied recommendation: ${formatMotionLabel(rec.motion)} (${rec.speed})`);
    setTimeout(() => setNoticeMessage(null), 3000);
  };

  // Adjust recommendation: loads into sliders so user can customize before generating
  const handleAdjustRecommendation = () => {
    if (!pendingRecommendation) return;
    const { recipe: rec } = pendingRecommendation;

    setMotion(rec.motion);
    setDistance(rec.distance);
    setAppearance(rec.appearance);
    setFrameCount(rec.frameCount);
    setSpeed(rec.speed);
    if (typeof rec.customMs === 'number') {
      setCustomMs(rec.customMs);
    }
    setWrap(rec.wrap);
    setLoop(rec.loop);

    setPendingRecommendation(null);
    setNoticeMessage('Loaded into controls. Adjust sliders below, then generate.');
    setTimeout(() => setNoticeMessage(null), 3000);
  };

  // Cancel recommendation without modifying current animation
  const handleCancelRecommendation = () => {
    setPendingRecommendation(null);
  };

  const currentPreviewMatrix = isPreviewing
    ? generatedFramesMatrix[previewFrameIndex] || sourceSnapshot
    : sourceSnapshot;

  return (
    <div className="flex flex-col gap-6">
      {/* Main Panel Card */}
      <div className="bg-white rounded-3xl p-6 border border-[#E6DFD5] shadow-xs flex flex-col gap-5">
        
        {/* Panel Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#F0EBE1]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#2A8B83]/15 text-[#2A8B83] flex items-center justify-center font-bold">
              <Wand2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-[#2D2926]">
                Animate This Frame
              </h2>
              <p className="text-xs text-[#7A7167]">
                Draw one frame, then turn on effects to create a seamless animation.
              </p>
            </div>
          </div>

          {/* Model status pill (informational only) */}
          <div className="text-[11px] flex items-center gap-1.5 self-start sm:self-center">
            {modelStatus.status === 'ready-webgpu' ? (
              <span className="px-2 py-0.5 rounded-full bg-[#E6F7F5] text-[#1E736B] font-bold border border-[#A7E2DC] flex items-center gap-1">
                <Zap className="w-2.5 h-2.5 fill-current" />
                <span>WebGPU Copilot Ready</span>
              </span>
            ) : modelStatus.status === 'ready-cpu' ? (
              <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-bold border border-blue-200 flex items-center gap-1">
                <Cpu className="w-2.5 h-2.5" />
                <span>CPU Mode</span>
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full bg-[#FAF6F0] text-[#7A7167] font-medium border border-[#E6DFD5]">
                100% Deterministic Engine
              </span>
            )}
          </div>
        </div>

        {/* Source Frame Snapshot & Live Sync Strip */}
        <div className="p-3.5 rounded-2xl bg-[#FAF6F0] border border-[#E6DFD5] flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {/* Mini preview canvas showing the source frame */}
              <div
                className="w-16 h-10 bg-[#0B1519] rounded-lg p-1 border border-[#163842] shadow-inner shrink-0 cursor-pointer"
                title="Click to toggle live effect preview"
                onClick={() => setIsPreviewing(!isPreviewing)}
              >
                <div
                  className="w-full h-full gap-[1px]"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: `repeat(${MATRIX_COLS}, minmax(0, 1fr))`,
                  }}
                >
                  {currentPreviewMatrix.map((row, rI) =>
                    row.map((val, cI) => (
                      <div
                        key={`${rI}-${cI}`}
                        className={`rounded-2xs transition-colors ${
                          val === 1 ? 'bg-[#0088FF]' : 'bg-[#182328]'
                        }`}
                      />
                    ))
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#2D2926]">
                    Source Base Frame ({analysis.litCount} lit LEDs)
                  </span>
                  <span className="px-1.5 py-0.2 rounded text-[10px] bg-[#2A8B83]/15 text-[#1E736B] font-semibold flex items-center gap-1">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                    <span>Live Synced</span>
                  </span>
                  {isPreviewing && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#0088FF] text-white font-mono font-bold animate-pulse">
                      Previewing #{previewFrameIndex + 1}/{recipe.frameCount}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-[#7A7167]">
                  {analysis.isBlank
                    ? 'Canvas is empty. Paint pixels in the editor on the left!'
                    : `${analysis.isHorizSymmetric ? 'Symmetrical' : 'Asymmetrical'} • Top: ${analysis.freeTop}px, Bottom: ${analysis.freeBottom}px free space`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleSyncFromCanvas}
                className="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-white border border-[#E6DFD5] text-[#2D2926] hover:bg-[#F2ECE3] transition-colors cursor-pointer flex items-center gap-1"
                title="Explicitly capture current editor canvas as the animation base"
              >
                <RotateCcw className="w-3 h-3 text-[#2A8B83]" />
                <span>Sync Canvas</span>
              </button>
              <button
                onClick={() => setIsPreviewing(!isPreviewing)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  isPreviewing
                    ? 'bg-[#0088FF] text-white shadow-xs'
                    : 'bg-white border border-[#E6DFD5] text-[#4A443D] hover:bg-[#F2ECE3]'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>{isPreviewing ? 'Stop Preview' : 'Preview Effect'}</span>
              </button>
              <button
                onClick={handleRestoreSource}
                className="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-white border border-[#E6DFD5] text-[#7A7167] hover:text-[#2D2926] hover:bg-[#F2ECE3] transition-colors cursor-pointer"
                title="Revert canvas back to initial single source frame"
              >
                Restore Single Frame
              </button>
            </div>
          </div>

          <div className="text-[11px] text-[#635B50] bg-white/70 px-3 py-1.5 rounded-xl border border-[#E8DFC8] flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-[#2A8B83] shrink-0" />
            <span>
              <strong>Real-time drawing sync:</strong> Any pixels you paint, erase, or invert in the editor are automatically used as the source frame. No need to save manually before clicking Generate!
            </span>
          </div>
        </div>

        {/* Optional AI Intent Suggester */}
        <div className="p-3.5 rounded-2xl bg-[#F2F9F8] border border-[#BCE4E0] flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#1E736B]">
              <Sparkles className="w-3.5 h-3.5 text-[#2A8B83]" />
              <span>Suggest Effects with Local AI (Optional)</span>
            </div>
            <span className="text-[10px] text-[#2A8B83] font-semibold">
              Translates intent to control sliders
            </span>
          </div>

          <p className="text-[11px] text-[#4D8C86]">
            Describe how the current drawing should move—for example, ‘bounce up and down fast.’
          </p>

          <div className="relative">
            <input
              type="text"
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSuggestAi()}
              placeholder="Describe how the current drawing should move—for example, ‘bounce up and down fast.’"
              disabled={isSuggestingAi}
              className="w-full pl-3 pr-28 py-2 rounded-xl bg-white border border-[#A7E2DC] text-xs font-medium text-[#2D2926] placeholder-[#8A9F9C] outline-none focus:border-[#2A8B83]"
            />
            <button
              onClick={() => handleSuggestAi()}
              disabled={isSuggestingAi || !aiPrompt.trim()}
              className="absolute right-1.5 top-1.5 bottom-1.5 px-3 rounded-lg bg-[#2A8B83] text-white font-bold text-xs hover:bg-[#21736D] disabled:opacity-50 transition-all flex items-center gap-1 cursor-pointer"
            >
              {isSuggestingAi ? (
                <>
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  <span>Thinking...</span>
                </>
              ) : (
                <span>Suggest</span>
              )}
            </button>
          </div>

          {/* Recommendation Preview Card (Compact preview before applying) */}
          {pendingRecommendation && (
            <div className="p-3.5 rounded-2xl bg-white border-2 border-[#2A8B83] shadow-xs flex flex-col gap-2.5 animate-fade-in mt-1">
              <div className="flex items-center justify-between border-b border-[#F0EBE1] pb-2">
                <div className="flex items-center gap-1.5 font-bold text-xs text-[#2D2926]">
                  <Sparkles className="w-4 h-4 text-[#2A8B83]" />
                  <span>Recommendation Preview</span>
                </div>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#E6F7F5] text-[#1E736B]">
                  {pendingRecommendation.source === 'heuristic' ? 'Deterministic Match' : 'Local AI Model'}
                </span>
              </div>

              {/* Compact summary list strictly matching spec */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                <div className="flex items-center justify-between py-0.5 border-b border-[#FAF6F0]">
                  <span className="text-[#7A7167]">Motion:</span>
                  <span className="font-bold text-[#2D2926]">
                    {formatMotionLabel(pendingRecommendation.recipe.motion)}
                  </span>
                </div>
                <div className="flex items-center justify-between py-0.5 border-b border-[#FAF6F0]">
                  <span className="text-[#7A7167]">Speed:</span>
                  <span className="font-bold text-[#2D2926]">
                    {formatSpeedLabel(pendingRecommendation.recipe.speed, pendingRecommendation.recipe.customMs)}
                  </span>
                </div>
                <div className="flex items-center justify-between py-0.5 border-b border-[#FAF6F0]">
                  <span className="text-[#7A7167]">Distance:</span>
                  <span className="font-bold text-[#2D2926]">
                    {pendingRecommendation.recipe.distance} px / frame
                  </span>
                </div>
                <div className="flex items-center justify-between py-0.5 border-b border-[#FAF6F0]">
                  <span className="text-[#7A7167]">Frames:</span>
                  <span className="font-bold text-[#2D2926]">
                    {pendingRecommendation.recipe.frameCount}
                  </span>
                </div>
                <div className="flex items-center justify-between py-0.5 border-b border-[#FAF6F0]">
                  <span className="text-[#7A7167]">Loop:</span>
                  <span className="font-bold text-[#2D2926]">
                    {formatLoopLabel(pendingRecommendation.recipe.loop)}
                  </span>
                </div>
                <div className="flex items-center justify-between py-0.5 border-b border-[#FAF6F0]">
                  <span className="text-[#7A7167]">Appearance effects:</span>
                  <span className="font-bold text-[#2D2926]">
                    {formatAppearanceLabel(pendingRecommendation.recipe.appearance)}
                  </span>
                </div>
              </div>

              {/* Action buttons: Apply, Adjust, Cancel */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#F0EBE1]">
                <button
                  onClick={handleCancelRecommendation}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#FAF6F0] hover:bg-[#F2ECE3] text-[#7A7167] hover:text-[#2D2926] border border-[#E6DFD5] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAdjustRecommendation}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-white hover:bg-[#F2ECE3] text-[#2A8B83] border border-[#2A8B83] transition-colors cursor-pointer"
                >
                  Adjust
                </button>
                <button
                  onClick={handleApplyRecommendation}
                  className="px-4 py-1.5 rounded-xl text-xs font-bold bg-[#2A8B83] hover:bg-[#21736D] text-white shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                  <span>Apply</span>
                </button>
              </div>
            </div>
          )}

          {/* Quick example chips */}
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            <span className="text-[10px] font-bold text-[#4D8C86]">Try:</span>
            {AI_SUGGESTION_PROMPTS.map((ex) => (
              <button
                key={ex}
                onClick={() => {
                  setAiPrompt(ex);
                  handleSuggestAi(ex);
                }}
                className="text-[10px] px-2 py-0.5 rounded-lg bg-white/80 hover:bg-white text-[#1E736B] border border-[#BCE4E0] font-medium transition-colors cursor-pointer"
              >
                {ex}
              </button>
            ))}
          </div>

          {aiErrorNotice && (
            <p className="text-[11px] text-amber-800 bg-amber-50 p-2 rounded-lg border border-amber-200">
              {aiErrorNotice}
            </p>
          )}
        </div>

        {/* Expandable Local AI Explanation Card */}
        <div className="rounded-2xl border border-[#BCE4E0] bg-[#F2F9F8] overflow-hidden transition-all">
          <button
            onClick={() => setIsExplainAiOpen(!isExplainAiOpen)}
            className="w-full p-3.5 flex items-center justify-between text-left hover:bg-[#E7F5F3] transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-[#2A8B83]/15 text-[#2A8B83] flex items-center justify-center shrink-0">
                <Cpu className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#1E736B]">
                    How Local On-Device AI Works
                  </span>
                  <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-[#2A8B83]/15 text-[#1E736B]">
                    Private • No API Key
                  </span>
                </div>
                <p className="text-[11px] text-[#4D8C86]">
                  On-device intelligence, WebGPU acceleration, and hybrid deterministic rendering.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-[#2A8B83]">
              <span className="text-xs font-semibold hidden sm:inline">
                {isExplainAiOpen ? 'Hide Details' : 'Explain'}
              </span>
              {isExplainAiOpen ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </div>
          </button>

          {isExplainAiOpen && (
            <div className="p-4 pt-1 border-t border-[#D5EFEA] flex flex-col gap-3 text-xs text-[#2D2926]">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-2">
                {/* 1. 100% Private & In-Browser */}
                <div className="p-3 rounded-xl bg-white border border-[#BCE4E0] flex flex-col gap-1.5 shadow-2xs">
                  <div className="flex items-center gap-1.5 font-bold text-[#1E736B]">
                    <ShieldCheck className="w-4 h-4 text-[#2A8B83]" />
                    <span>100% Private & In-Browser</span>
                  </div>
                  <p className="text-[11px] text-[#5D554B] leading-relaxed">
                    Your prompts, drawn pixel frames, and animation recipes never leave your computer. There are no tracking scripts, no cloud inference servers, and zero API keys required.
                  </p>
                </div>

                {/* 2. Web Worker & WebGPU */}
                <div className="p-3 rounded-xl bg-white border border-[#BCE4E0] flex flex-col gap-1.5 shadow-2xs">
                  <div className="flex items-center gap-1.5 font-bold text-[#1E736B]">
                    <Zap className="w-4 h-4 text-[#2A8B83]" />
                    <span>WebGPU Hardware Acceleration</span>
                  </div>
                  <p className="text-[11px] text-[#5D554B] leading-relaxed">
                    Runs <code className="text-[10px] bg-[#FAF6F0] px-1 py-0.5 rounded font-mono text-[#1E736B]">SmolLM2-135M-Instruct</code> in an isolated browser Web Worker. Computations happen asynchronously without blocking or freezing the editing canvas. Falls back smoothly to WASM / CPU.
                  </p>
                </div>

                {/* 3. Semantic Intent Routing */}
                <div className="p-3 rounded-xl bg-white border border-[#BCE4E0] flex flex-col gap-1.5 shadow-2xs">
                  <div className="flex items-center gap-1.5 font-bold text-[#1E736B]">
                    <Sparkles className="w-4 h-4 text-[#2A8B83]" />
                    <span>Semantic Intent Routing</span>
                  </div>
                  <p className="text-[11px] text-[#5D554B] leading-relaxed">
                    Small models struggle to draw reliable 13×8 coordinate matrices directly. Instead, the local AI functions as an intent router: translating phrases like <em>"make it bounce happily"</em> into motion, speed, and frame count parameters.
                  </p>
                </div>

                {/* 4. Deterministic Rendering Engine */}
                <div className="p-3 rounded-xl bg-white border border-[#BCE4E0] flex flex-col gap-1.5 shadow-2xs">
                  <div className="flex items-center gap-1.5 font-bold text-[#1E736B]">
                    <Layers className="w-4 h-4 text-[#2A8B83]" />
                    <span>Deterministic Pixel Engine</span>
                  </div>
                  <p className="text-[11px] text-[#5D554B] leading-relaxed">
                    The resulting frames are calculated deterministically in TypeScript from your exact drawn frame. This guarantees mathematically perfect 13×8 LED boundaries, flawless loops, and zero distorted or hallucinated pixels.
                  </p>
                </div>
              </div>

              {/* Attribution and Caching strip */}
              <div className="p-2.5 rounded-xl bg-white/80 border border-[#BCE4E0] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-[#4D8C86]">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-[#1E736B]">Model:</span>
                  <span className="font-mono text-[10px] text-[#2D2926]">
                    onnx-community/SmolLM2-135M-Instruct-ONNX-MHA
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[10px]">
                  <span>Downloaded once & cached in browser storage</span>
                  <a
                    href="https://huggingface.co/onnx-community/SmolLM2-135M-Instruct-ONNX-MHA"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-[#2A8B83] font-bold hover:underline"
                  >
                    <span>Hugging Face</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 1. Frame Count Controls */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-[#2D2926]">
              1. Animation Frame Count
            </label>
            <span className="text-[11px] text-[#7A7167]">
              Loops seamlessly across {frameCount} frames
            </span>
          </div>

          <div className="grid grid-cols-5 gap-2">
            {[2, 4, 8, 12, 16].map((count) => {
              const isSelected = frameCount === count;
              return (
                <button
                  key={count}
                  onClick={() => setFrameCount(count as any)}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer text-center ${
                    isSelected
                      ? 'bg-[#2A8B83] text-white shadow-xs'
                      : 'bg-[#FAF6F0] border border-[#E6DFD5] text-[#5D554B] hover:bg-white hover:border-[#2A8B83]/50'
                  }`}
                >
                  {count} Frames
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Playback Speed Controls */}
        <div className="flex flex-col gap-2 pt-2 border-t border-[#F0EBE1]">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-[#2D2926]">
              2. Playback Speed ({delayMs} ms / frame)
            </label>
            <span className="text-[11px] text-[#7A7167]">
              {(1000 / delayMs).toFixed(1)} FPS
            </span>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {[
              { id: 'slow', label: 'Slow (320ms)' },
              { id: 'medium', label: 'Medium (180ms)' },
              { id: 'fast', label: 'Fast (100ms)' },
              { id: 'custom', label: 'Custom' },
            ].map((s) => {
              const isSelected = speed === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => setSpeed(s.id as SpeedPreset)}
                  className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer text-center ${
                    isSelected
                      ? 'bg-[#2A8B83] text-white shadow-xs'
                      : 'bg-[#FAF6F0] border border-[#E6DFD5] text-[#5D554B] hover:bg-white'
                  }`}
                >
                  {s.label}
                </button>
              );
            })}
          </div>

          {speed === 'custom' && (
            <div className="flex items-center gap-3 pt-1">
              <span className="text-xs text-[#7A7167]">Custom Delay:</span>
              <input
                type="range"
                min="50"
                max="600"
                step="25"
                value={customMs}
                onChange={(e) => setCustomMs(Number(e.target.value))}
                className="flex-1 accent-[#2A8B83] cursor-pointer"
              />
              <span className="text-xs font-mono font-bold text-[#2D2926] w-14 text-right">
                {customMs}ms
              </span>
            </div>
          )}
        </div>

        {/* 3. Primary Motion Effect Selection */}
        <div className="flex flex-col gap-2 pt-2 border-t border-[#F0EBE1]">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-[#2D2926]">
              3. Primary Motion Effect
            </label>
            <span className="text-[11px] text-[#7A7167]">
              Choose 1 motion type
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {MOTION_OPTIONS.map((opt) => {
              const isSelected = motion === opt.id;
              return (
                <div
                  key={opt.id}
                  onClick={() => setMotion(opt.id)}
                  className={`p-2.5 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between gap-1 ${
                    isSelected
                      ? 'border-[#2A8B83] bg-[#F2F9F8] shadow-xs'
                      : 'border-[#EADBCE] bg-[#FAF6F0] hover:border-[#2A8B83]/50 hover:bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#2D2926]">
                      {opt.label}
                    </span>
                    {isSelected && (
                      <Check className="w-3.5 h-3.5 text-[#2A8B83] stroke-[3]" />
                    )}
                  </div>
                  <span className="text-[10px] text-[#7A7167] leading-tight">
                    {opt.desc}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Motion Fine-Tuning Controls */}
          {motion !== 'none' && (
            <div className="mt-2 p-3 rounded-xl bg-[#FAF6F0] border border-[#E6DFD5] flex flex-wrap items-center justify-between gap-3 text-xs">
              {/* Distance Control */}
              <div className="flex items-center gap-2">
                <span className="font-semibold text-[#5D554B]">Pixel distance per frame:</span>
                <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-[#E6DFD5]">
                  {[1, 2, 3].map((d) => (
                    <button
                      key={d}
                      onClick={() => setDistance(d)}
                      className={`px-2 py-0.5 rounded text-xs font-bold cursor-pointer ${
                        distance === d
                          ? 'bg-[#2A8B83] text-white'
                          : 'text-[#7A7167] hover:text-[#2D2926]'
                      }`}
                      title={`${d} pixel${d > 1 ? 's' : ''} per frame`}
                    >
                      {d} px/frame
                    </button>
                  ))}
                </div>
              </div>

              {/* Edge Wrapping toggle */}
              {(motion === 'drift-left' || motion === 'drift-right' || motion === 'rise' || motion === 'fall') && (
                <label className="flex items-center gap-1.5 cursor-pointer text-[#5D554B] font-semibold select-none">
                  <input
                    type="checkbox"
                    checked={wrap}
                    onChange={(e) => setWrap(e.target.checked)}
                    className="accent-[#2A8B83] cursor-pointer"
                  />
                  <span>Wrap at edge</span>
                </label>
              )}

              {/* Loop Style */}
              {(motion === 'rise' || motion === 'fall' || motion === 'shake') && (
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-[#5D554B]">Loop:</span>
                  <button
                    onClick={() => setLoop(loop === 'seamless' ? 'ping-pong' : 'seamless')}
                    className="px-2 py-0.5 rounded-lg bg-white border border-[#E6DFD5] font-bold text-xs text-[#2A8B83] cursor-pointer"
                  >
                    {loop === 'seamless' ? 'Seamless Continuous' : 'Ping-Pong Bounce'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 4. Appearance Effects Selection */}
        <div className="flex flex-col gap-2 pt-2 border-t border-[#F0EBE1]">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-[#2D2926]">
              4. Appearance Effects (Combine with motion)
            </label>
            <div className="flex items-center gap-2">
              {appearance.length === 0 ? (
                <span className="text-[11px] font-semibold text-[#2A8B83] bg-[#2A8B83]/10 px-2 py-0.5 rounded-md flex items-center gap-1">
                  <Check className="w-3 h-3 stroke-[3]" />
                  <span>None active (Clean motion)</span>
                </span>
              ) : (
                <button
                  onClick={() => setAppearance([])}
                  className="text-[11px] font-semibold text-[#2A8B83] hover:underline cursor-pointer flex items-center gap-1"
                >
                  <span>Reset to None</span>
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {APPEARANCE_OPTIONS.map((app) => {
              const isChecked =
                app.id === 'none'
                  ? appearance.length === 0
                  : appearance.includes(app.id as AppearanceEffectType);
              return (
                <div
                  key={app.id}
                  onClick={() => toggleAppearance(app.id)}
                  className={`p-2.5 rounded-xl border-2 transition-all cursor-pointer flex items-start gap-2.5 ${
                    isChecked
                      ? 'border-[#2A8B83] bg-[#F2F9F8] shadow-2xs'
                      : 'border-[#EADBCE] bg-[#FAF6F0] hover:border-[#2A8B83]/40 hover:bg-white'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded mt-0.5 flex items-center justify-center shrink-0 border transition-colors ${
                      isChecked
                        ? 'bg-[#2A8B83] border-[#2A8B83] text-white'
                        : 'bg-white border-[#C9C0B3]'
                    }`}
                  >
                    {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                  <div className="flex flex-col flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#2D2926]">
                        {app.label}
                      </span>
                      {isChecked && (
                        <span className="text-[10px] font-bold text-[#2A8B83] bg-[#2A8B83]/10 px-1.5 py-0.2 rounded">
                          Active
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-[#7A7167]">
                      {app.desc}
                    </span>
                    {app.warning && isChecked && (
                      <span className="text-[10px] text-amber-700 font-semibold flex items-center gap-0.5 mt-0.5">
                        <AlertTriangle className="w-2.5 h-2.5" />
                        <span>{app.warning}</span>
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 5. Effect Pipeline Order Indicator */}
        <div className="p-3 rounded-xl bg-[#FAF6F0] border border-[#E6DFD5] flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#7A7167]">
          <div className="flex items-center gap-1 font-semibold">
            <Layers className="w-3.5 h-3.5 text-[#2A8B83]" />
            <span>Active Pipeline Order:</span>
          </div>
          <div className="flex flex-wrap items-center gap-1 font-mono text-[10px] text-[#2D2926]">
            <span className="px-1.5 py-0.5 bg-white rounded border border-[#E6DFD5]">
              1. motion: {motion}
            </span>
            <ChevronRight className="w-3 h-3 text-[#A3998C]" />
            <span className="px-1.5 py-0.5 bg-white rounded border border-[#E6DFD5]">
              2. appearance: {appearance.length > 0 ? appearance.join('+') : 'none'}
            </span>
            <ChevronRight className="w-3 h-3 text-[#A3998C]" />
            <span className="px-1.5 py-0.5 bg-white rounded border border-[#E6DFD5]">
              3. 13×8 Clip & Validate
            </span>
          </div>
        </div>

        {/* Action Controls Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#F0EBE1]">
          <div className="flex items-center gap-2">
            <button
              onClick={handleResetEffects}
              className="px-3 py-2 rounded-xl text-xs font-semibold bg-white border border-[#E6DFD5] text-[#7A7167] hover:text-[#2D2926] hover:bg-[#F2ECE3] transition-colors cursor-pointer flex items-center gap-1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Effects</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleGenerateAnimation}
              className="px-5 py-2.5 rounded-xl font-bold text-xs bg-[#2A8B83] text-white hover:bg-[#21736D] transition-all flex items-center gap-2 shadow-sm cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>Generate Animation</span>
            </button>
          </div>
        </div>

        {/* Notice Toast */}
        {noticeMessage && (
          <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-300 text-xs text-emerald-900 font-bold flex items-center gap-2 animate-fade-in">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>{noticeMessage}</span>
          </div>
        )}
      </div>

      {/* Preset Designs Showcase (Loads starting frames easily) */}
      <div className="bg-white rounded-3xl p-6 border border-[#E6DFD5] shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-[#2D2926]">
              Grace Hopper Hacks Design Presets
            </h3>
            <p className="text-xs text-[#7A7167]">
              Load any curated design into your editor, then animate it above.
            </p>
          </div>
          <span className="text-xs font-semibold text-[#2A8B83] bg-[#2A8B83]/10 px-2.5 py-1 rounded-full">
            {PRESET_ARTS.length} Ready Designs
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {PRESET_ARTS.map((art) => (
            <div
              key={art.id}
              onClick={() => {
                generatedSignaturesRef.current.clear();
                onApplyAnimation(
                  art.frames.map((matrix, i) => ({ id: `preset-${art.id}-${i}`, matrix })),
                  art.frameDelayMs,
                  art.title,
                  art.description
                );
                setSourceSnapshot(art.frames[0].map((r) => [...r]));
                setNoticeMessage(`Loaded preset: ${art.title}`);
                setTimeout(() => setNoticeMessage(null), 2500);
              }}
              className="group relative p-3 rounded-2xl border-2 border-[#EADBCE] bg-[#FAF6F0] hover:border-[#2A8B83] hover:bg-white transition-all cursor-pointer flex flex-col items-center text-center gap-2"
            >
              {/* Mini preview canvas showing the actual first frame */}
              <div className="w-full aspect-[13/8] bg-[#071317] rounded-xl p-1.5 border border-[#163842] shadow-inner flex items-center justify-center">
                <div
                  className="w-full h-full gap-[1px]"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: `repeat(${art.frames[0][0]?.length || 13}, minmax(0, 1fr))`,
                  }}
                >
                  {art.frames[0].map((row, rI) =>
                    row.map((val, cI) => (
                      <div
                        key={`${rI}-${cI}`}
                        className={`rounded-[1px] transition-colors ${
                          val === 1
                            ? 'bg-[#0088FF] shadow-[0_0_2px_#0088FF]'
                            : 'bg-[#101F25]'
                        }`}
                      />
                    ))
                  )}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-center gap-1">
                  <span className="text-sm">{art.emoji}</span>
                  <h4 className="text-xs font-bold text-[#2D2926]">
                    {art.title}
                  </h4>
                </div>
                <span className="text-[10px] text-[#8C8275]">
                  {art.frames.length} {art.frames.length === 1 ? 'Frame' : 'Frames'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
