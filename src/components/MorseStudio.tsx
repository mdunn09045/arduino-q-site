import React, { useState, useEffect, useRef } from 'react';
import {
  Volume2,
  VolumeX,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Cpu,
  Radio,
  Share2,
  Info,
} from 'lucide-react';
import {
  MORSE_TABLE,
  textToMorse,
  textToMorseTimings,
  morseAudio,
  MorseTimingItem,
  morseToMatrixFrame,
} from '../utils/morse';
import { Frame } from '../types';

interface MorseStudioProps {
  onLoadMatrixFrames: (title: string, description: string, frames: Frame[], delayMs: number) => void;
  onSetGeneratedMorseCode: (name: string, morseStr: string) => void;
}

export const MorseStudio: React.FC<MorseStudioProps> = ({
  onLoadMatrixFrames,
  onSetGeneratedMorseCode,
}) => {
  const [nameInput, setNameInput] = useState<string>('GRACE');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [activeStepIndex, setActiveStepIndex] = useState<number>(-1);
  const [activeChar, setActiveChar] = useState<string>('');
  const [isBeaconLit, setIsBeaconLit] = useState<boolean>(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const cleanText = nameInput.toUpperCase().trim() || 'GRACE';
  const morseString = textToMorse(cleanText);
  const timings = textToMorseTimings(cleanText, 140);

  // Sync with parent for code generator
  useEffect(() => {
    onSetGeneratedMorseCode(cleanText, morseString);
  }, [cleanText, morseString, onSetGeneratedMorseCode]);

  // Handle Play / Stop Morse Sequence
  const togglePlayMorse = () => {
    if (isPlaying) {
      stopPlayback();
    } else {
      startPlayback();
    }
  };

  const stopPlayback = () => {
    setIsPlaying(false);
    setIsBeaconLit(false);
    setActiveStepIndex(-1);
    setActiveChar('');
    morseAudio.stopTone();
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const startPlayback = () => {
    if (timings.length === 0) return;
    setIsPlaying(true);
    let step = 0;

    const playNextStep = () => {
      if (step >= timings.length) {
        // Loop back after short pause
        timerRef.current = setTimeout(() => {
          step = 0;
          playNextStep();
        }, 800);
        return;
      }

      const item: MorseTimingItem = timings[step];
      setActiveStepIndex(step);
      setActiveChar(item.char);

      if (item.type === 'on') {
        setIsBeaconLit(true);
        if (soundEnabled) {
          morseAudio.playTone(720);
        }
      } else {
        setIsBeaconLit(false);
        morseAudio.stopTone();
      }

      timerRef.current = setTimeout(() => {
        morseAudio.stopTone();
        step++;
        playNextStep();
      }, item.durationMs);
    };

    playNextStep();
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      morseAudio.stopTone();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  // Convert Morse Name into playable Matrix Animation Frames
  const handleLoadAsMatrixAnimation = () => {
    // Generate frames representing the dots and dashes
    const frames: Frame[] = [];

    // Dot frame (centered compact 3x2 square for 13-col grid)
    const dotGrid = Array.from({ length: 8 }, () => Array(13).fill(0));
    for (let r = 3; r <= 4; r++) {
      for (let c = 5; c <= 7; c++) dotGrid[r][c] = 1;
    }

    // Dash frame (centered wide 9x2 rectangle for 13-col grid)
    const dashGrid = Array.from({ length: 8 }, () => Array(13).fill(0));
    for (let r = 3; r <= 4; r++) {
      for (let c = 2; c <= 10; c++) dashGrid[r][c] = 1;
    }

    // Off frame
    const offGrid = Array.from({ length: 8 }, () => Array(13).fill(0));

    // Construct animation sequence
    cleanText.split('').forEach((char, cIdx) => {
      const code = MORSE_TABLE[char];
      if (!code) return;

      for (let i = 0; i < code.length; i++) {
        const symbol = code[i];
        frames.push({
          id: `morse-${cIdx}-${i}-on`,
          matrix: symbol === '.' ? dotGrid : dashGrid,
        });
        frames.push({
          id: `morse-${cIdx}-${i}-off`,
          matrix: offGrid,
        });
      }
    });

    onLoadMatrixFrames(
      `Morse Name: ${cleanText}`,
      `Morse code blinking sequence for "${cleanText}" (${morseString})`,
      frames.length > 0 ? frames : [{ id: 'f1', matrix: offGrid }],
      180
    );
  };

  return (
    <div className="flex flex-col gap-6">
      
      {/* Name Input & Morse Converter */}
      <div className="bg-white rounded-3xl p-6 border border-[#E6DFD5] shadow-xs">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-8 h-8 rounded-xl bg-[#2A8B83]/10 text-[#2A8B83] flex items-center justify-center font-bold">
            <Radio className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-[#2D2926]">
              Morse Code Name Generator
            </h2>
            <p className="text-xs text-[#7A7167]">
              Type your name to convert it into official dots and dashes, listen to the telegraph tone, and flash it on the Arduino.
            </p>
          </div>
        </div>

        {/* Name Input */}
        <div className="mt-2">
          <label className="text-xs font-bold text-[#6C6358] uppercase tracking-wider block mb-1.5">
            Your Name / Hackathon Handle:
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value.toUpperCase())}
              placeholder="e.g. ADA, GRACE, HOPPER"
              maxLength={20}
              className="flex-1 px-4 py-3 rounded-2xl bg-[#FAF6F0] border-2 border-[#E6DFD5] focus:border-[#2A8B83] focus:bg-white text-base font-bold font-mono tracking-widest text-[#2D2926] outline-none uppercase transition-all shadow-inner"
            />

            <button
              onClick={togglePlayMorse}
              className={`px-5 py-3 rounded-2xl font-bold text-sm text-white flex items-center gap-2 shadow-sm transition-all cursor-pointer ${
                isPlaying
                  ? 'bg-[#D9532F] hover:bg-[#C04322]'
                  : 'bg-[#2A8B83] hover:bg-[#20726B]'
              }`}
            >
              {isPlaying ? (
                <>
                  <Pause className="w-4 h-4 fill-current" />
                  <span>Stop</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  <span>Play Morse</span>
                </>
              )}
            </button>

            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-3 rounded-2xl border transition-colors cursor-pointer ${
                soundEnabled
                  ? 'bg-white border-[#E6DFD5] text-[#2A8B83] hover:bg-[#F2ECE1]'
                  : 'bg-gray-100 border-gray-300 text-gray-400'
              }`}
              title={soundEnabled ? 'Mute 700Hz tone' : 'Enable 700Hz tone'}
            >
              {soundEnabled ? (
                <Volume2 className="w-5 h-5" />
              ) : (
                <VolumeX className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {/* Live Morse Visual Display */}
        <div className="mt-5 p-4 rounded-2xl bg-[#142226] text-white border-2 border-[#1E3B42] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {/* Virtual LED beacon */}
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={`w-10 h-10 rounded-full transition-all duration-75 flex items-center justify-center ${
                  isBeaconLit
                    ? 'bg-[#FF3333] shadow-[0_0_16px_5px_rgba(255,50,50,0.9)] scale-110'
                    : 'bg-[#1D3036] border border-[#2A4852]'
                }`}
              >
                <div
                  className={`w-3 h-3 rounded-full ${
                    isBeaconLit ? 'bg-white' : 'bg-[#101D21]'
                  }`}
                />
              </div>
              <span className="text-[10px] font-mono text-[#76A8B5]">
                {isBeaconLit ? 'LED ON' : 'LED OFF'}
              </span>
            </div>

            <div>
              <div className="text-xs font-mono text-[#8ECEE0]">
                TRANSLATION FOR "{cleanText}":
              </div>
              <div className="text-lg sm:text-2xl font-mono font-bold tracking-widest text-[#FFC72C] mt-0.5 break-all">
                {morseString || '...'}
              </div>
              {activeChar && (
                <div className="text-xs text-[#52E078] font-bold mt-1">
                  Transmitting letter: <span className="underline">{activeChar}</span>
                </div>
              )}
            </div>
          </div>

          <button
            onClick={handleLoadAsMatrixAnimation}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs bg-[#2A8B83] hover:bg-[#20726B] text-white transition-all shadow-xs cursor-pointer whitespace-nowrap"
          >
            <Cpu className="w-4 h-4" />
            <span>Load onto 13×8 Light Grid Simulator</span>
          </button>
        </div>

        {/* Letter by Letter Breakdown Cards */}
        <div className="mt-5">
          <span className="text-xs font-bold uppercase tracking-wider text-[#8C8275] block mb-2">
            Letter Breakdown:
          </span>
          <div className="flex flex-wrap gap-2">
            {cleanText.split('').map((char, i) => {
              const code = MORSE_TABLE[char];
              const isCurrent = activeChar === char && isPlaying;
              return (
                <div
                  key={i}
                  className={`px-3 py-2 rounded-xl border text-center transition-all ${
                    isCurrent
                      ? 'bg-[#2A8B83] text-white border-[#2A8B83] scale-105 shadow-sm'
                      : 'bg-[#FAF6F0] border-[#E8DFC8] text-[#2D2926]'
                  }`}
                >
                  <div className="text-sm font-extrabold">{char}</div>
                  <div className="text-xs font-mono font-bold tracking-wider mt-0.5 opacity-90">
                    {code || '?'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* International Morse Reference Table */}
      <div className="bg-white rounded-3xl p-6 border border-[#E6DFD5] shadow-xs">
        <div className="flex items-center gap-2 mb-3">
          <Info className="w-4 h-4 text-[#D9532F]" />
          <h3 className="text-base font-bold text-[#2D2926]">
            International Morse Code Reference
          </h3>
        </div>
        <p className="text-xs text-[#7A7167] mb-4">
          A dot (dit) is 1 unit of time; a dash (dah) is 3 units. Letter space is 3 units, word space is 7 units.
        </p>

        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-9 gap-2 text-xs font-mono">
          {Object.entries(MORSE_TABLE)
            .filter(([key]) => /^[A-Z0-9]$/.test(key))
            .map(([char, code]) => (
              <div
                key={char}
                className="p-2 rounded-xl bg-[#FAF6F0] border border-[#EADBCE] text-center hover:bg-[#F2ECE1] transition-colors"
              >
                <div className="font-bold text-[#2D2926] text-sm">{char}</div>
                <div className="text-[11px] font-semibold text-[#D9532F] tracking-wider mt-0.5">
                  {code}
                </div>
              </div>
            ))}
        </div>
      </div>

    </div>
  );
};
