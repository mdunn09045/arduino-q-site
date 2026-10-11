import React, { useState, useEffect } from 'react';
import { Type, Sparkles, ArrowRight, Play, Cpu, Check, Layers } from 'lucide-react';
import { renderScrollingNameFrames, renderLetterCarouselFrames, FONT_3X5 } from '../utils/pixelFont';
import { Frame } from '../types';

interface NameSpellerStudioProps {
  onLoadNameAnimation: (title: string, description: string, frames: Frame[], delayMs: number) => void;
  defaultName?: string;
}

export const NameSpellerStudio: React.FC<NameSpellerStudioProps> = ({
  onLoadNameAnimation,
  defaultName = 'ADA',
}) => {
  const [name, setName] = useState<string>(defaultName);
  const [mode, setMode] = useState<'marquee' | 'carousel' | 'compact'>('marquee');
  const [previewStep, setPreviewStep] = useState<number>(0);
  const [previewPlaying, setPreviewPlaying] = useState<boolean>(true);

  const cleanName = name.toUpperCase().replace(/[^A-Z0-9 !♥]/g, '').trim() || 'ADA';

  // Compute generated frames based on mode
  const generatedFrames = React.useMemo(() => {
    if (mode === 'marquee') {
      return renderScrollingNameFrames(cleanName, 13, 8);
    } else if (mode === 'carousel') {
      return renderLetterCarouselFrames(cleanName, 13, 8);
    } else {
      // Compact mode: center up to 3 letters
      const glyphs = cleanName.slice(0, 3).split('').map((c) => FONT_3X5[c] || FONT_3X5[' ']);
      const totalW = glyphs.reduce((sum, g) => sum + g[0].length + 1, 0) - 1;
      const startC = Math.max(0, Math.floor((13 - totalW) / 2));
      const frameMatrix: number[][] = Array.from({ length: 8 }, () => Array(13).fill(0));

      let currC = startC;
      glyphs.forEach((g) => {
        const gh = g.length;
        const gw = g[0].length;
        const startR = Math.floor((8 - gh) / 2);
        for (let r = 0; r < gh; r++) {
          for (let c = 0; c < gw; c++) {
            if (currC + c < 13) {
              frameMatrix[startR + r][currC + c] = g[r][c];
            }
          }
        }
        currC += gw + 1;
      });

      return [{ matrix: frameMatrix }];
    }
  }, [cleanName, mode]);

  // Preview animation timer
  useEffect(() => {
    if (!previewPlaying || generatedFrames.length <= 1) return;
    const interval = setInterval(() => {
      setPreviewStep((prev) => (prev + 1) % generatedFrames.length);
    }, mode === 'marquee' ? 180 : 500);

    return () => clearInterval(interval);
  }, [previewPlaying, generatedFrames.length, mode]);

  const handleApplyToSimulator = () => {
    const converted: Frame[] = generatedFrames.map((f, i) => ({
      id: `name-${cleanName}-${mode}-${i}`,
      matrix: f.matrix,
    }));

    onLoadNameAnimation(
      `Name: ${cleanName}`,
      `${mode === 'marquee' ? 'Scrolling marquee' : 'Letter sequence'} for "${cleanName}" on Arduino UNO Q`,
      converted,
      mode === 'marquee' ? 180 : 450
    );
  };

  const sampleNames = ['ADA', 'GRACE', 'HOPPER', 'MLH', 'GHC', 'HACKER'];

  const currentPreviewFrame = generatedFrames[previewStep] || generatedFrames[0];

  return (
    <div className="bg-white rounded-3xl p-6 border border-[#E6DFD5] shadow-xs flex flex-col gap-5">
      
      {/* Header */}
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-xl bg-[#0088FF]/10 text-[#0088FF] flex items-center justify-center font-bold">
          <Type className="w-4 h-4" />
        </div>
        <div>
          <h2 className="text-base sm:text-lg font-bold text-[#2D2926]">
            Spell Your Name on the 13×8 Light Grid
          </h2>
          <p className="text-xs text-[#7A7167]">
            Turn any name or message into a smooth scrolling marquee or letter carousel on the Arduino UNO Q.
          </p>
        </div>
      </div>

      {/* Name Input Bar */}
      <div>
        <label className="text-xs font-bold text-[#6C6358] uppercase tracking-wider block mb-1.5">
          Type Your Name or Text:
        </label>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value.toUpperCase())}
            placeholder="e.g. ADA"
            maxLength={18}
            className="flex-1 px-4 py-3 rounded-2xl bg-[#FAF6F0] border-2 border-[#E6DFD5] focus:border-[#0088FF] focus:bg-white text-base font-bold font-mono tracking-wider text-[#2D2926] outline-none uppercase transition-all shadow-inner"
          />

          <button
            onClick={handleApplyToSimulator}
            className="px-5 py-3 rounded-2xl font-bold text-xs sm:text-sm bg-[#0088FF] hover:bg-[#0070D1] text-white flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer whitespace-nowrap"
          >
            <Cpu className="w-4 h-4" />
            <span>Load onto Simulator</span>
          </button>
        </div>

        {/* Quick Sample Name Chips */}
        <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
          <span className="text-[11px] text-[#8C8275] font-semibold mr-1">Quick Try:</span>
          {sampleNames.map((s) => (
            <button
              key={s}
              onClick={() => setName(s)}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-colors cursor-pointer ${
                cleanName === s
                  ? 'bg-[#0088FF] text-white shadow-2xs'
                  : 'bg-[#FAF6F0] hover:bg-[#F2ECE1] text-[#4A443D] border border-[#E6DFD5]'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Mode Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-[#F0EBE1]">
        <div className="flex items-center gap-2 text-xs font-semibold text-[#6C6358]">
          <span>Display Style:</span>
          <div className="flex items-center gap-1 bg-[#FAF6F0] p-1 rounded-xl border border-[#E8DFC8]">
            <button
              onClick={() => {
                setMode('marquee');
                setPreviewStep(0);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                mode === 'marquee'
                  ? 'bg-[#0088FF] text-white shadow-xs'
                  : 'text-[#6C6358] hover:text-[#2D2926]'
              }`}
            >
              Marquee Scroll
            </button>

            <button
              onClick={() => {
                setMode('carousel');
                setPreviewStep(0);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                mode === 'carousel'
                  ? 'bg-[#0088FF] text-white shadow-xs'
                  : 'text-[#6C6358] hover:text-[#2D2926]'
              }`}
            >
              Letter Carousel
            </button>

            <button
              onClick={() => {
                setMode('compact');
                setPreviewStep(0);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                mode === 'compact'
                  ? 'bg-[#0088FF] text-white shadow-xs'
                  : 'text-[#6C6358] hover:text-[#2D2926]'
              }`}
            >
              Compact Initials
            </button>
          </div>
        </div>

        <span className="text-[11px] font-mono text-[#8C8275]">
          {generatedFrames.length} animation step(s)
        </span>
      </div>

      {/* Mini Live Preview Box */}
      <div className="p-4 rounded-2xl bg-[#091519] border-2 border-[#163842] flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#73A9B7]">
            Live Name Preview:
          </span>
          <div className="text-sm font-mono font-bold text-white mt-0.5">
            "{cleanName}" ({mode === 'marquee' ? 'Horizontal Scroll' : mode === 'carousel' ? 'Letter by Letter' : 'Static Centered'})
          </div>
        </div>

        {/* 13x8 Mini Display */}
        <div
          className="w-36 h-20 bg-[#061013] rounded-xl p-1.5 gap-[1.5px] border border-[#1E434F] shadow-inner"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(13, minmax(0, 1fr))',
          }}
        >
          {currentPreviewFrame?.matrix.map((row, rI) =>
            row.map((val, cI) => (
              <div
                key={`${rI}-${cI}`}
                className={`rounded-xs transition-colors duration-75 ${
                  val === 1
                    ? 'bg-[#0088FF] shadow-[0_0_4px_#0088FF]'
                    : 'bg-[#122228]'
                }`}
              />
            ))
          )}
        </div>
      </div>

    </div>
  );
};
