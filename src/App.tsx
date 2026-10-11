/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Header } from './components/Header';
import { ArduinoSimulator } from './components/ArduinoSimulator';
import { CreationStudio } from './components/CreationStudio';
import { CommunityGallery } from './components/CommunityGallery';
import { CodeViewer } from './components/CodeViewer';
import { SetupGuide } from './components/SetupGuide';
import { Frame } from './types';
import { PRESET_ARTS } from './utils/presets';
import {
  generateArduinoMatrixCode,
  generateUnoQPythonAppLabCode,
} from './utils/arduinoCode';
import { Sparkles, Heart } from 'lucide-react';

export default function App() {
  // Initial animation: Steaming Coffee Mug (13x8)
  const initialPreset = PRESET_ARTS[0];
  const [projectTitle, setProjectTitle] = useState<string>(initialPreset.title);
  const [projectDescription, setProjectDescription] = useState<string>(
    initialPreset.description
  );
  const [frameDelayMs, setFrameDelayMs] = useState<number>(initialPreset.frameDelayMs);

  const [frames, setFrames] = useState<Frame[]>(() =>
    initialPreset.frames.map((matrix, idx) => ({
      id: `init-${idx}`,
      matrix,
    }))
  );
  const [activeFrameIndex, setActiveFrameIndex] = useState<number>(0);

  // Undo history stack
  const [undoHistory, setUndoHistory] = useState<
    { title: string; description: string; frames: Frame[]; frameDelayMs: number }[]
  >([]);

  const currentCols = frames[0]?.matrix[0]?.length || 13;
  const currentRows = frames[0]?.matrix?.length || 8;

  // Handle updating single frame matrix
  const handleUpdateFrameMatrix = (frameIndex: number, newMatrix: number[][]) => {
    setFrames((prev) => {
      const copy = [...prev];
      if (copy[frameIndex]) {
        copy[frameIndex] = {
          ...copy[frameIndex],
          matrix: newMatrix,
        };
      }
      return copy;
    });
  };

  // Handle moving frame (reordering)
  const handleMoveFrame = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0 || fromIndex >= frames.length || toIndex >= frames.length) {
      return;
    }
    setFrames((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
    setActiveFrameIndex(toIndex);
  };

  // Handle adding empty frame
  const handleAddFrame = () => {
    const blank = Array.from({ length: currentRows }, () => Array(currentCols).fill(0));
    const newFrame: Frame = {
      id: `frame-${Date.now()}`,
      matrix: blank,
    };
    setFrames((prev) => [...prev, newFrame]);
    setActiveFrameIndex(frames.length);
  };

  // Handle duplicating current frame
  const handleDuplicateFrame = () => {
    const current = frames[activeFrameIndex] || frames[0];
    const duplicated: Frame = {
      id: `frame-${Date.now()}`,
      matrix: current.matrix.map((row) => [...row]),
    };
    setFrames((prev) => {
      const next = [...prev];
      next.splice(activeFrameIndex + 1, 0, duplicated);
      return next;
    });
    setActiveFrameIndex((prev) => prev + 1);
  };

  // Handle deleting a frame
  const handleDeleteFrame = (idxToDelete: number) => {
    if (frames.length <= 1) return;
    setFrames((prev) => prev.filter((_, i) => i !== idxToDelete));
    setActiveFrameIndex((prev) => (prev >= frames.length - 1 ? frames.length - 2 : prev));
  };

  // Load animation from AI, Preset, or Community (preserves undo history)
  const handleLoadAnimation = (
    title: string,
    description: string,
    newFrames: Frame[],
    delayMs: number
  ) => {
    // Push current complete animation into undo history before replacing
    setUndoHistory((prev) => [
      ...prev.slice(-9), // retain up to 10 snapshots
      {
        title: projectTitle,
        description: projectDescription,
        frames: frames.map((f) => ({ id: f.id, matrix: f.matrix.map((r) => [...r]) })),
        frameDelayMs,
      },
    ]);

    setProjectTitle(title);
    setProjectDescription(description);
    setFrames(newFrames);
    setFrameDelayMs(delayMs);
    setActiveFrameIndex(0);
  };

  // Undo to previous complete animation
  const handleUndo = () => {
    if (undoHistory.length === 0) return;
    const previous = undoHistory[undoHistory.length - 1];
    setUndoHistory((prev) => prev.slice(0, prev.length - 1));
    setProjectTitle(previous.title);
    setProjectDescription(previous.description);
    setFrames(previous.frames);
    setFrameDelayMs(previous.frameDelayMs);
    setActiveFrameIndex(0);
  };

  // Generate Arduino UNO Q Python (App Lab) and C++ Sketches
  const pythonAppLabCode = useMemo(() => {
    return generateUnoQPythonAppLabCode(projectTitle, frames, frameDelayMs);
  }, [projectTitle, frames, frameDelayMs]);

  const arduinoMatrixCode = useMemo(() => {
    return generateArduinoMatrixCode(projectTitle, frames, frameDelayMs, true);
  }, [projectTitle, frames, frameDelayMs]);

  return (
    <div className="min-h-screen bg-[#FAF6F0] text-[#2D2926] flex flex-col font-sans">
      
      {/* Top Header - Clean branding, no overkill nav bar */}
      <Header />

      {/* Main Studio Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col gap-10">
        
        {/* 2-Column Responsive Workspace Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Simulator + Hardware Info + Setup Guide */}
          <div className="lg:col-span-6 flex flex-col gap-6">
            <ArduinoSimulator
              frames={frames}
              activeFrameIndex={activeFrameIndex}
              setActiveFrameIndex={setActiveFrameIndex}
              onUpdateFrameMatrix={handleUpdateFrameMatrix}
              onAddFrame={handleAddFrame}
              onDuplicateFrame={handleDuplicateFrame}
              onDeleteFrame={handleDeleteFrame}
              onMoveFrame={handleMoveFrame}
              onUndo={handleUndo}
              canUndo={undoHistory.length > 0}
              frameDelayMs={frameDelayMs}
              setFrameDelayMs={setFrameDelayMs}
              title={projectTitle}
            />

            {/* Arduino UNO Q Setup Guide (Moved to left side to balance full screen columns) */}
            <SetupGuide />
          </div>

          {/* Right Column: Creation Studio (AI Prompt / Spell a Name toggle) + Code Generator */}
          <div className="lg:col-span-6 flex flex-col gap-6">
            
            {/* Unified Creation Studio with in-card toggle */}
            <CreationStudio
              currentFrame={frames[activeFrameIndex] || frames[0]}
              onLoadAnimation={handleLoadAnimation}
              onRestoreSourceFrame={(sourceMatrix) => {
                const restored: Frame = {
                  id: `source-${Date.now()}`,
                  matrix: sourceMatrix.map((r) => [...r]),
                };
                setFrames([restored]);
                setActiveFrameIndex(0);
              }}
            />

            {/* Flashable Code Viewer (Code Generator) */}
            <CodeViewer
              pythonAppLabCode={pythonAppLabCode}
              matrixCode={arduinoMatrixCode}
              pythonMorseCode=""
              morseCode=""
              projectTitle={projectTitle}
            />

          </div>

        </div>

        {/* Bottom Section: See What Others Made (Community Gallery) - Always visible */}
        <section className="pt-4 border-t border-[#E6DFD5]">
          <CommunityGallery
            onLoadCreation={handleLoadAnimation}
            currentFrames={frames}
            currentTitle={projectTitle}
            currentDelayMs={frameDelayMs}
          />
        </section>

      </main>

      {/* Footer */}
      <footer className="mt-16 border-t border-[#E6DFD5] bg-[#FAF6F0] py-8 text-center text-xs text-[#7A7167]">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#2D2926]">Grace Hopper Hacks</span>
            <span>•</span>
            <span>Hosted by MLH at Grace Hopper Celebration</span>
          </div>
          <div className="flex items-center gap-1 text-[#8C8275]">
            <span>Crafted for attendees with</span>
            <Heart className="w-3.5 h-3.5 text-[#D9532F] fill-current" />
            <span>for the Arduino UNO Q</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
