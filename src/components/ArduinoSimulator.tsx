import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Plus,
  Copy,
  Trash2,
  RotateCcw,
  Eraser,
  PenTool,
  Undo2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Frame } from '../types';

interface ArduinoSimulatorProps {
  frames: Frame[];
  activeFrameIndex: number;
  setActiveFrameIndex: React.Dispatch<React.SetStateAction<number>>;
  onUpdateFrameMatrix: (frameIndex: number, newMatrix: number[][]) => void;
  onAddFrame: () => void;
  onDuplicateFrame: () => void;
  onDeleteFrame: (frameIndex: number) => void;
  onMoveFrame?: (fromIndex: number, toIndex: number) => void;
  onUndo?: () => void;
  canUndo?: boolean;
  frameDelayMs: number;
  setFrameDelayMs: (ms: number) => void;
  title?: string;
  isExternalPlaying?: boolean;
}

export const ArduinoSimulator: React.FC<ArduinoSimulatorProps> = ({
  frames,
  activeFrameIndex,
  setActiveFrameIndex,
  onUpdateFrameMatrix,
  onAddFrame,
  onDuplicateFrame,
  onDeleteFrame,
  onMoveFrame,
  onUndo,
  canUndo = false,
  frameDelayMs,
  setFrameDelayMs,
  title = 'Untitled Animation',
  isExternalPlaying = false,
}) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [drawTool, setDrawTool] = useState<'pen' | 'eraser'>('pen');
  const [isMouseDown, setIsMouseDown] = useState<boolean>(false);

  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;

  const currentFrame = frames[activeFrameIndex] || frames[0] || {
    id: 'f1',
    matrix: Array.from({ length: 8 }, () => Array(13).fill(0)),
  };

  const cols = currentFrame.matrix[0]?.length || 13;
  const rows = currentFrame.matrix.length || 8;

  // Animation Loop Timer
  useEffect(() => {
    if (!isPlaying && !isExternalPlaying) return;
    if (frames.length <= 1) return;

    const timer = setInterval(() => {
      setActiveFrameIndex((prev) => (prev + 1) % frames.length);
    }, frameDelayMs);

    return () => clearInterval(timer);
  }, [isPlaying, isExternalPlaying, frames.length, frameDelayMs, setActiveFrameIndex]);

  // Global Undo shortcut (Ctrl+Z / Cmd+Z)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        const target = e.target as HTMLElement;
        if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
          return;
        }
        if (canUndo && onUndo) {
          e.preventDefault();
          onUndo();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canUndo, onUndo]);

  // Handle pointer down on pixel
  const handlePixelInteract = (row: number, col: number) => {
    if (isPlaying) {
      setIsPlaying(false);
    }

    const currentMatrix = currentFrame.matrix;
    const newMatrix = currentMatrix.map((r) => [...r]);
    
    newMatrix[row][col] = drawTool === 'pen' 
      ? (currentMatrix[row][col] === 1 ? 0 : 1) 
      : 0;

    onUpdateFrameMatrix(activeFrameIndex, newMatrix);
  };

  // Handle pointer drag on pixel
  const handlePixelHover = (row: number, col: number) => {
    if (!isMouseDown) return;
    const currentMatrix = currentFrame.matrix;
    const newMatrix = currentMatrix.map((r) => [...r]);
    const targetValue = drawTool === 'pen' ? 1 : 0;
    
    if (newMatrix[row][col] !== targetValue) {
      newMatrix[row][col] = targetValue;
      onUpdateFrameMatrix(activeFrameIndex, newMatrix);
    }
  };

  // Matrix manipulation helpers
  const handleClear = () => {
    const blank = Array.from({ length: rows }, () => Array(cols).fill(0));
    onUpdateFrameMatrix(activeFrameIndex, blank);
  };

  const handleInvert = () => {
    const inverted = currentFrame.matrix.map((row) =>
      row.map((val) => (val === 1 ? 0 : 1))
    );
    onUpdateFrameMatrix(activeFrameIndex, inverted);
  };

  const handleFill = () => {
    const filled = Array.from({ length: rows }, () => Array(cols).fill(1));
    onUpdateFrameMatrix(activeFrameIndex, filled);
  };

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-7 border border-[#E6DFD5] shadow-sm flex flex-col gap-6">
      
      {/* Title & Board Status Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#F0EBE1]">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#0088FF] animate-pulse" />
            <h2 className="text-lg sm:text-xl font-bold text-[#2D2926]">
              Arduino Uno Q
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-[#7A7167]">
            {title}
          </p>
        </div>
      </div>

      {/* Realistic Arduino UNO Q Board Enclosure */}
      <div
        className="relative mx-auto w-full max-w-2xl bg-gradient-to-br from-[#0D242C] via-[#0B2A34] to-[#061B21] rounded-3xl p-5 sm:p-7 border-4 border-[#164855] shadow-2xl text-white select-none overflow-hidden"
        onMouseUp={() => setIsMouseDown(false)}
        onMouseLeave={() => setIsMouseDown(false)}
      >
        {/* Subtle PCB gold/copper circuit traces */}
        <div className="absolute inset-0 opacity-15 pointer-events-none bg-[radial-gradient(#4DC2D8_1px,transparent_1px)] [background-size:16px_16px]" />
        
        {/* Board Header Branding */}
        <div className="flex items-center justify-between relative z-10 mb-4">
          <div className="flex items-center gap-2">
            <span className="font-black text-white tracking-widest text-base">ARDUINO</span>
            <span className="bg-[#0088FF] text-white px-2 py-0.5 rounded-md text-[11px] font-sans font-black shadow-xs">
              UNO Q
            </span>
          </div>
        </div>

        {/* THE 13x8 MONOCHROME BLUE LED MATRIX CONTAINER */}
        <div className="relative z-10 bg-[#081216] p-3 sm:p-5 rounded-2xl border-2 border-[#1E4D59] shadow-inner max-w-xl mx-auto">
          <div
            className="gap-1.5 sm:gap-2 py-2 px-1 touch-none cursor-crosshair justify-center items-center"
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
            }}
            onMouseDown={() => setIsMouseDown(true)}
          >
            {currentFrame.matrix.map((row, rIdx) =>
              row.map((val, cIdx) => {
                const isOn = val === 1;
                return (
                  <div
                    key={`${rIdx}-${cIdx}`}
                    onMouseDown={() => handlePixelInteract(rIdx, cIdx)}
                    onMouseEnter={() => handlePixelHover(rIdx, cIdx)}
                    className={`relative aspect-square rounded-full transition-all duration-100 flex items-center justify-center cursor-pointer ${
                      isOn
                        ? 'bg-[#0088FF] shadow-[0_0_10px_2.5px_rgba(0,140,255,0.9),inset_0_0_4px_#D6EEFF] border border-[#40A8FF] scale-105 z-10'
                        : 'bg-[#121E23] hover:bg-[#1E3037] border border-[#233A42]'
                    }`}
                    title={`Row ${rIdx}, Col ${cIdx}: ${isOn ? 'ON' : 'OFF'}`}
                  >
                    {/* Metallic micro-diode core */}
                    <div
                      className={`w-1.5 h-1.5 rounded-full transition-opacity ${
                        isOn ? 'bg-white opacity-95' : 'bg-[#0B1317] opacity-60'
                      }`}
                    />
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Matrix Editing & Animation Controls */}
      <div className="flex flex-col gap-4 bg-[#FAF6F0] p-4 rounded-2xl border border-[#EADBCE]">
        
        {/* Top Control Bar: Drawing Tools & Matrix Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Tool toggles: Pen vs Eraser */}
          <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-[#E6DFD5]">
            <button
              onClick={() => setDrawTool('pen')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                drawTool === 'pen'
                  ? 'bg-[#0088FF] text-white shadow-xs'
                  : 'text-[#6C6358] hover:bg-[#FAF6F0]'
              }`}
            >
              <PenTool className="w-3.5 h-3.5" />
              <span>Paint</span>
            </button>
            <button
              onClick={() => setDrawTool('eraser')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                drawTool === 'eraser'
                  ? 'bg-[#0088FF] text-white shadow-xs'
                  : 'text-[#6C6358] hover:bg-[#FAF6F0]'
              }`}
            >
              <Eraser className="w-3.5 h-3.5" />
              <span>Erase</span>
            </button>
          </div>

          {/* Quick Matrix Helpers & Undo */}
          <div className="flex items-center gap-2">
            {onUndo && (
              <button
                onClick={onUndo}
                disabled={!canUndo}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-white border border-[#E6DFD5] text-[#2A8B83] hover:bg-[#E8F5F3] disabled:opacity-40 disabled:hover:bg-white transition-colors cursor-pointer"
                title="Undo to previous animation or edits (Ctrl+Z / Cmd+Z)"
              >
                <Undo2 className="w-3.5 h-3.5" />
                <span>Undo</span>
              </button>
            )}
            <button
              onClick={handleInvert}
              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-white border border-[#E6DFD5] text-[#4A443D] hover:bg-[#F2ECE3] transition-colors cursor-pointer"
              title="Invert all LEDs in this frame"
            >
              Invert
            </button>
            <button
              onClick={handleFill}
              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-white border border-[#E6DFD5] text-[#4A443D] hover:bg-[#F2ECE3] transition-colors cursor-pointer"
              title="Turn all LEDs ON"
            >
              Fill All
            </button>
            <button
              onClick={handleClear}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-white border border-[#E6DFD5] text-[#D9532F] hover:bg-[#FFF0ED] transition-colors cursor-pointer"
              title="Turn all LEDs OFF in this frame"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Clear</span>
            </button>
          </div>
        </div>

        {/* Animation Timeline & Playback Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-3 border-t border-[#EADBCE]">
          {/* Playback buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm text-white shadow-sm transition-all cursor-pointer ${
                isPlaying
                  ? 'bg-[#2A8B83] hover:bg-[#21736D]'
                  : 'bg-[#0088FF] hover:bg-[#0070D1]'
              }`}
            >
              {isPlaying ? (
                <>
                  <Pause className="w-4 h-4 fill-current" />
                  <span>Pause</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  <span>Play Animation</span>
                </>
              )}
            </button>

            <button
              onClick={() => {
                setIsPlaying(false);
                setActiveFrameIndex(
                  (activeFrameIndex - 1 + frames.length) % frames.length
                );
              }}
              disabled={frames.length <= 1}
              className="p-2 rounded-xl bg-white border border-[#E6DFD5] text-[#4A443D] hover:bg-[#F2ECE3] disabled:opacity-40 transition-colors cursor-pointer"
              title="Previous frame"
            >
              <SkipBack className="w-4 h-4" />
            </button>

            <button
              onClick={() => {
                setIsPlaying(false);
                setActiveFrameIndex((activeFrameIndex + 1) % frames.length);
              }}
              disabled={frames.length <= 1}
              className="p-2 rounded-xl bg-white border border-[#E6DFD5] text-[#4A443D] hover:bg-[#F2ECE3] disabled:opacity-40 transition-colors cursor-pointer"
              title="Next frame"
            >
              <SkipForward className="w-4 h-4" />
            </button>

            <span className="text-xs font-mono font-bold text-[#7A7167] ml-1">
              Frame {activeFrameIndex + 1}/{frames.length}
            </span>
          </div>

          {/* Animation Speed Slider */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-[#6C6358] whitespace-nowrap">
              Speed: {frameDelayMs}ms
            </span>
            <input
              type="range"
              min="100"
              max="800"
              step="50"
              value={frameDelayMs}
              onChange={(e) => setFrameDelayMs(Number(e.target.value))}
              className="w-28 sm:w-36 accent-[#0088FF] cursor-pointer"
            />
          </div>
        </div>

        {/* Frames Thumbnail Ribbon */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-2">
          {frames.map((frame, idx) => {
            const isActive = idx === activeFrameIndex;
            return (
              <div
                key={frame.id || idx}
                onClick={() => {
                  setIsPlaying(false);
                  setActiveFrameIndex(idx);
                }}
                className={`group relative flex-shrink-0 p-1.5 rounded-xl border-2 transition-all cursor-pointer ${
                  isActive
                    ? 'border-[#0088FF] bg-white shadow-md scale-105'
                    : 'border-[#E6DFD5] bg-[#FAF6F0] hover:border-[#0088FF]/50'
                }`}
              >
                {/* Mini preview canvas */}
                <div
                  className="w-16 h-10 bg-[#0B1519] rounded-md gap-[1px] p-0.5"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
                  }}
                >
                  {frame.matrix.map((r, rI) =>
                    r.map((v, cI) => (
                      <div
                        key={`${rI}-${cI}`}
                        className={`rounded-xs ${
                          v === 1 ? 'bg-[#0088FF]' : 'bg-[#182328]'
                        }`}
                      />
                    ))
                  )}
                </div>

                <div className="flex items-center justify-between mt-1 text-[10px] font-mono px-0.5">
                  <div className="flex items-center gap-1">
                    <span
                      className={`font-bold ${
                        isActive ? 'text-[#0088FF]' : 'text-[#7A7167]'
                      }`}
                    >
                      #{idx + 1}
                    </span>
                    {frames.length > 1 && onMoveFrame && (
                      <div className="flex items-center opacity-70 hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onMoveFrame(idx, idx - 1);
                          }}
                          disabled={idx === 0}
                          className="hover:text-[#0088FF] disabled:opacity-20 cursor-pointer p-0.5"
                          title="Move frame left"
                        >
                          <ChevronLeft className="w-2.5 h-2.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onMoveFrame(idx, idx + 1);
                          }}
                          disabled={idx === frames.length - 1}
                          className="hover:text-[#0088FF] disabled:opacity-20 cursor-pointer p-0.5"
                          title="Move frame right"
                        >
                          <ChevronRight className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  {frames.length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteFrame(idx);
                      }}
                      className="text-gray-400 hover:text-red-500 transition-colors p-0.5 cursor-pointer"
                      title="Delete this frame"
                    >
                      <Trash2 className="w-2.5 h-2.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {/* Add Frame & Duplicate Frame buttons */}
          <div className="flex items-center gap-1.5 pl-1">
            <button
              onClick={onAddFrame}
              className="flex items-center gap-1 px-3 py-2 rounded-xl bg-white border border-dashed border-[#B8AEA0] text-xs font-bold text-[#6C6358] hover:border-[#0088FF] hover:text-[#0088FF] transition-all cursor-pointer whitespace-nowrap"
              title="Add empty frame"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Frame</span>
            </button>

            <button
              onClick={onDuplicateFrame}
              className="flex items-center gap-1 px-3 py-2 rounded-xl bg-white border border-[#E6DFD5] text-xs font-bold text-[#6C6358] hover:border-[#2A8B83] hover:text-[#2A8B83] transition-all cursor-pointer whitespace-nowrap"
              title="Duplicate current frame"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Duplicate</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
