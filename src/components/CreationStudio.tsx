import React, { useState } from 'react';
import { Wand2, Type } from 'lucide-react';
import { AnimateFramePanel } from './AnimateFramePanel';
import { NameSpellerStudio } from './NameSpellerStudio';
import { Frame } from '../types';

interface CreationStudioProps {
  currentFrame: Frame;
  onLoadAnimation: (
    title: string,
    description: string,
    frames: Frame[],
    delayMs: number
  ) => void;
  onRestoreSourceFrame?: (matrix: number[][]) => void;
}

export const CreationStudio: React.FC<CreationStudioProps> = ({
  currentFrame,
  onLoadAnimation,
  onRestoreSourceFrame,
}) => {
  const [mode, setMode] = useState<'animate' | 'name'>('animate');

  return (
    <div className="flex flex-col gap-4">
      {/* Segmented Mode Switcher */}
      <div className="bg-white rounded-2xl p-1.5 border border-[#E6DFD5] shadow-2xs flex items-center gap-1.5">
        <button
          onClick={() => setMode('animate')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            mode === 'animate'
              ? 'bg-[#2A8B83] text-white shadow-xs'
              : 'text-[#6C6358] hover:text-[#2D2926] hover:bg-[#FAF6F0]'
          }`}
        >
          <Wand2 className="w-4 h-4" />
          <span>Animate This Frame</span>
        </button>

        <button
          onClick={() => setMode('name')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            mode === 'name'
              ? 'bg-[#2A8B83] text-white shadow-xs'
              : 'text-[#6C6358] hover:text-[#2D2926] hover:bg-[#FAF6F0]'
          }`}
        >
          <Type className="w-4 h-4" />
          <span>Spell a Name</span>
        </button>
      </div>

      {/* Mode Content */}
      {mode === 'animate' ? (
        <AnimateFramePanel
          currentFrame={currentFrame}
          onApplyAnimation={(frames, delayMs, title, description) =>
            onLoadAnimation(
              title || 'Custom Animation',
              description || 'Generated animation',
              frames,
              delayMs
            )
          }
          onRestoreSourceFrame={onRestoreSourceFrame}
        />
      ) : (
        <NameSpellerStudio
          onLoadNameAnimation={onLoadAnimation}
          defaultName="ADA"
        />
      )}
    </div>
  );
};
