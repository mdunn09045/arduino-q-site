import React, { useState } from 'react';
import {
  Code2,
  Copy,
  Check,
  Download,
  Cpu,
  BookOpen,
  Sparkles,
  Binary,
  Layers,
  Activity,
  Lightbulb,
  Clock,
  HelpCircle,
  Sliders,
  ChevronRight,
} from 'lucide-react';
import { downloadSketch } from '../utils/arduinoCode';

interface CodeViewerProps {
  pythonAppLabCode: string;
  matrixCode: string;
  pythonMorseCode: string;
  morseCode: string;
  projectTitle: string;
}

function stripComments(code: string, isPython: boolean): string {
  const lines = code.split('\n');
  const result: string[] = [];
  let inBlock = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (!inBlock) {
      if (isPython && trimmed.startsWith('"""')) {
        if (!trimmed.slice(3).includes('"""')) inBlock = true;
        continue;
      }
      if (!isPython && trimmed.startsWith('/*')) {
        if (!trimmed.slice(2).includes('*/')) inBlock = true;
        continue;
      }
      if (isPython && trimmed.startsWith('#')) continue;
      if (!isPython && trimmed.startsWith('//')) continue;
      
      let codePart = line;
      if (isPython && line.includes('#')) {
        codePart = line.split('#')[0].trimEnd();
      } else if (!isPython && line.includes('//')) {
        codePart = line.split('//')[0].trimEnd();
      }
      if (codePart.trim() || (result.length > 0 && result[result.length - 1].trim())) {
        result.push(codePart);
      }
    } else {
      if (isPython && trimmed.includes('"""')) inBlock = false;
      else if (!isPython && trimmed.includes('*/')) inBlock = false;
    }
  }
  return result.join('\n').trim();
}

const HighlightedCode: React.FC<{ code: string; isPython: boolean }> = ({ code, isPython }) => {
  const lines = code.split('\n');
  let inBlockComment = false;

  const renderCodeTokens = (text: string) => {
    const tokenRegex = /(\b(?:import|from|def|while|for|in|try|except|const|void|int|uint8_t|return|switch|case|break|if|else|true|false|True|False|None|include)\b|\b(?:matrix|Serial|time|led)\.[a-zA-Z0-9_]+|\b\d+(?:\.\d+)?\b|"[^"]*"|'[^']*')/g;
    const parts = text.split(tokenRegex);
    return parts.map((part, i) => {
      if (!part) return null;
      if (/^(import|from|def|while|for|in|try|except|const|void|int|uint8_t|return|switch|case|break|if|else|true|false|True|False|None|include)$/.test(part)) {
        return <span key={i} className="text-[#38BDF8] font-bold">{part}</span>;
      }
      if (/^(matrix|Serial|time|led)\.[a-zA-Z0-9_]+$/.test(part)) {
        return <span key={i} className="text-[#A78BFA] font-semibold">{part}</span>;
      }
      if (/^\d+(\.\d+)?$/.test(part)) {
        return <span key={i} className="text-[#FBBF24] font-semibold">{part}</span>;
      }
      if (/^("[^"]*"|'[^']*')$/.test(part)) {
        return <span key={i} className="text-[#FDE047]">{part}</span>;
      }
      return <span key={i} className="text-gray-200">{part}</span>;
    });
  };

  return (
    <div className="font-mono text-[11px] leading-relaxed">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        let isFullComment = false;
        let codePart = line;
        let commentPart = '';

        if (!inBlockComment) {
          if (isPython && trimmed.startsWith('"""')) {
            isFullComment = true;
            if (!trimmed.slice(3).includes('"""')) inBlockComment = true;
          } else if (!isPython && trimmed.startsWith('/*')) {
            isFullComment = true;
            if (!trimmed.slice(2).includes('*/')) inBlockComment = true;
          } else if (isPython && trimmed.startsWith('#')) {
            isFullComment = true;
          } else if (!isPython && trimmed.startsWith('//')) {
            isFullComment = true;
          } else if (isPython && line.includes('#')) {
            const splitIdx = line.indexOf('#');
            codePart = line.substring(0, splitIdx);
            commentPart = line.substring(splitIdx);
          } else if (!isPython && line.includes('//')) {
            const splitIdx = line.indexOf('//');
            codePart = line.substring(0, splitIdx);
            commentPart = line.substring(splitIdx);
          }
        } else {
          isFullComment = true;
          if (isPython && trimmed.includes('"""')) inBlockComment = false;
          else if (!isPython && trimmed.includes('*/')) inBlockComment = false;
        }

        return (
          <div key={idx} className="flex hover:bg-[#0E2028] transition-colors py-[1px]">
            <span className="w-10 pr-3 text-right text-[#436473] select-none shrink-0 border-r border-[#153E4A]/60">
              {idx + 1}
            </span>
            <span className="pl-4 whitespace-pre overflow-x-auto flex-1">
              {isFullComment ? (
                <span className="text-[#4ADE80] italic font-medium">{line}</span>
              ) : (
                <>
                  {renderCodeTokens(codePart)}
                  {commentPart && (
                    <span className="text-[#4ADE80] italic font-medium">{commentPart}</span>
                  )}
                </>
              )}
            </span>
          </div>
        );
      })}
    </div>
  );
};

export const CodeViewer: React.FC<CodeViewerProps> = ({
  pythonAppLabCode,
  matrixCode,
  pythonMorseCode,
  morseCode,
  projectTitle,
}) => {
  // Default to C++ (.ino) for flashing physical board LEDs directly
  const [activeTab, setActiveTab] = useState<'cpp' | 'python' | 'morse_cpp' | 'morse_py'>('cpp');
  const [activeViewMode, setActiveViewMode] = useState<'code' | 'concepts' | 'commands' | 'challenges'>('code');
  const [showBareCode, setShowBareCode] = useState<boolean>(false);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [selectedConcept, setSelectedConcept] = useState<string>('bitmap');

  const cleanTitle = projectTitle.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase() || 'uno_q_matrix';

  let rawFullCode = matrixCode;
  let currentFilename = `${cleanTitle}.ino`;
  let currentLanguage = 'C++ (.ino) - Direct Physical Board Flash';
  const isPython = activeTab === 'python' || activeTab === 'morse_py';

  if (activeTab === 'cpp') {
    rawFullCode = matrixCode;
    currentFilename = `${cleanTitle}.ino`;
    currentLanguage = 'C++ (.ino) - Direct Board Flash';
  } else if (activeTab === 'python') {
    rawFullCode = pythonAppLabCode;
    currentFilename = `${cleanTitle}.py`;
    currentLanguage = 'Python (Console Troubleshooting Only - Does Not Light Board)';
  } else if (activeTab === 'morse_cpp') {
    rawFullCode = morseCode;
    currentFilename = 'uno_q_morse.ino';
    currentLanguage = 'C++ (.ino) - Morse Board Flash';
  } else {
    rawFullCode = pythonMorseCode;
    currentFilename = 'uno_q_morse.py';
    currentLanguage = 'Python - Morse Console Troubleshooting Only';
  }

  const currentCode = showBareCode ? stripComments(rawFullCode, isPython) : rawFullCode;

  const handleCopy = () => {
    navigator.clipboard.writeText(currentCode);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleDownload = () => {
    downloadSketch(currentFilename, currentCode);
  };

  return (
    <div className="flex flex-col gap-6">
      
      {/* Code Viewer Panel */}
      <div className="bg-white rounded-3xl p-6 border border-[#E6DFD5] shadow-xs">
        
        {/* Header Tab */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#F0EBE1]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#0088FF]/10 text-[#0088FF] flex items-center justify-center font-bold">
              <Code2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-[#2D2926] flex items-center gap-2">
                Arduino UNO Q Code & Learning Studio
              </h2>
              <p className="text-xs text-[#7A7167]">
                <strong>C++ (.ino) is the default</strong> to flash the physical LED matrix. Python is provided for serial console troubleshooting.
              </p>
            </div>
          </div>

          {/* Language Switcher - C++ first as default, Python clearly marked as troubleshooting */}
          <div className="flex flex-wrap items-center gap-1.5 bg-[#FAF6F0] p-1.5 rounded-xl border border-[#E8DFC8] self-start sm:self-auto">
            <button
              onClick={() => setActiveTab('cpp')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'cpp'
                  ? 'bg-[#0088FF] text-white shadow-xs'
                  : 'text-[#6C6358] hover:text-[#2D2926]'
              }`}
            >
              <span>⚡ C++ (.ino - Physical Board)</span>
              <span className={`text-[9px] px-1.5 py-0.5 rounded font-extrabold ${activeTab === 'cpp' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800'}`}>
                DEFAULT
              </span>
            </button>
            <button
              onClick={() => setActiveTab('python')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'python'
                  ? 'bg-[#5A5046] text-white shadow-xs'
                  : 'text-[#6C6358] hover:text-[#2D2926]'
              }`}
            >
              <span>🐍 Python (Troubleshooting / Monitor Only)</span>
            </button>
          </div>
        </div>

        {/* Educational View Tabs (Code, Concepts, Commands, Challenges) */}
        <div className="flex flex-wrap items-center gap-2 mt-4 pb-2 border-b border-[#F0EBE1]">
          <button
            onClick={() => setActiveViewMode('code')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeViewMode === 'code'
                ? 'bg-[#2D2926] text-white shadow-xs'
                : 'bg-[#FAF6F0] text-[#6C6358] hover:text-[#2D2926] border border-[#E6DFD5]'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>Generated Code</span>
          </button>

          <button
            onClick={() => setActiveViewMode('concepts')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeViewMode === 'concepts'
                ? 'bg-[#2A8B83] text-white shadow-xs'
                : 'bg-[#FAF6F0] text-[#6C6358] hover:text-[#2D2926] border border-[#E6DFD5]'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>🎓 How It Works (Concepts)</span>
          </button>

          <button
            onClick={() => setActiveViewMode('commands')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeViewMode === 'commands'
                ? 'bg-[#0088FF] text-white shadow-xs'
                : 'bg-[#FAF6F0] text-[#6C6358] hover:text-[#2D2926] border border-[#E6DFD5]'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>⚡ Command Glossary</span>
          </button>

          <button
            onClick={() => setActiveViewMode('challenges')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeViewMode === 'challenges'
                ? 'bg-[#D9532F] text-white shadow-xs'
                : 'bg-[#FAF6F0] text-[#6C6358] hover:text-[#2D2926] border border-[#E6DFD5]'
            }`}
          >
            <Lightbulb className="w-3.5 h-3.5" />
            <span>🔬 Hacker Experiments</span>
          </button>
        </div>

        {/* Tab 1: Full Code View */}
        {activeViewMode === 'code' && (
          <div>
            {/* Beginner Explainer Callout: How Comments Work */}
            <div className="my-3.5 p-4 rounded-2xl bg-emerald-50/90 border border-emerald-300 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <span className="p-1.5 rounded-xl bg-emerald-200 text-emerald-800 text-sm leading-none shrink-0 font-bold mt-0.5">
                  💡
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-emerald-950 uppercase tracking-wide">
                      Beginner Guide: What are Comments vs. Real Code?
                    </h4>
                    <span className="text-[10px] font-bold bg-emerald-200 text-emerald-900 px-1.5 py-0.5 rounded font-mono">
                      {isPython ? 'Python #' : 'C++ // and /* */'}
                    </span>
                  </div>
                  <p className="text-xs text-emerald-900 mt-1 leading-relaxed">
                    Notice the <span className="font-bold text-emerald-700 bg-emerald-100/90 px-1 py-0.5 rounded font-mono">bright green text</span> below?
                    Those are <strong>code comments</strong> (starting with <code className="font-mono font-bold">{isPython ? '#' : '//'}</code>).
                    The microcontroller <em>completely ignores</em> them when running your project! They are notes written by engineers for humans to read and understand.
                  </p>
                </div>
              </div>

              {/* Color legend pills */}
              <div className="flex flex-wrap md:flex-col gap-1.5 text-[11px] font-mono shrink-0">
                <div className="flex items-center gap-1.5 text-emerald-800 bg-white px-2.5 py-1 rounded-lg border border-emerald-200 shadow-2xs">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#4ADE80] inline-block border border-emerald-600" />
                  <span><strong>Green</strong> = Comment (Ignored by board)</span>
                </div>
                <div className="flex items-center gap-1.5 text-sky-800 bg-white px-2.5 py-1 rounded-lg border border-sky-200 shadow-2xs">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#38BDF8] inline-block" />
                  <span><strong>Blue/Purple</strong> = Executable Commands</span>
                </div>
                <div className="flex items-center gap-1.5 text-amber-800 bg-white px-2.5 py-1 rounded-lg border border-amber-200 shadow-2xs">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#FBBF24] inline-block" />
                  <span><strong>Gold</strong> = Values (0/1 LEDs, delay)</span>
                </div>
              </div>
            </div>

            {/* Python Troubleshooting / Monitor Only Callout */}
            {isPython && (
              <div className="mb-3.5 p-4 rounded-2xl bg-amber-50/95 border-2 border-amber-400 shadow-xs flex items-start gap-3.5 text-xs text-amber-950">
                <span className="p-2 rounded-xl bg-amber-200 text-amber-900 text-base leading-none shrink-0 font-bold mt-0.5">
                  ⚠️
                </span>
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-extrabold uppercase tracking-wider text-xs text-amber-950">
                      Troubleshooting / Monitor Only: Python Does NOT Light Up the Physical Board!
                    </span>
                    <span className="text-[10px] font-mono font-bold bg-amber-200 text-amber-900 px-2 py-0.5 rounded border border-amber-300">
                      Serial Monitor Output Only
                    </span>
                  </div>
                  <p className="mt-1.5 leading-relaxed text-amber-950 font-medium">
                    When you run this script in <strong>Arduino App Lab for MicroPython</strong>, it prints character art frames (<code className="bg-amber-100 font-mono font-bold px-1 rounded text-amber-900">🟦</code>/<code className="bg-amber-100 font-mono font-bold px-1 rounded text-amber-900">⬛</code>) to your computer's <strong>serial monitor / console window</strong> for troubleshooting logic. <strong>It will NOT illuminate the physical LEDs on the board.</strong>
                  </p>
                  <div className="mt-3 p-3 bg-white/95 rounded-xl border border-amber-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
                    <span className="text-amber-950 text-[11px] font-medium">
                      👉 <strong>Want to see the actual LEDs light up on your board?</strong> Switch to the <strong>⚡ C++ (.ino)</strong> tab and upload using Arduino IDE!
                    </span>
                    <button
                      onClick={() => setActiveTab('cpp')}
                      className="px-3.5 py-1.5 bg-[#0088FF] hover:bg-[#0070D1] text-white font-bold text-xs rounded-lg shadow-xs shrink-0 cursor-pointer flex items-center gap-1 transition-all"
                    >
                      <span>Switch to C++ (.ino)</span>
                      <span>→</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* educational comment toggle and legend */}

            {/* Action Bar: Toggle Comments & Copy/Download */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 my-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-mono text-[#8C8275]">
                  File: <span className="font-bold text-[#2D2926]">{currentFilename}</span>
                </span>
                
                {/* Educational Toggle: Full Code with Comments vs Bare Executable Code */}
                <div className="flex items-center gap-1 bg-[#FAF6F0] p-1 rounded-xl border border-[#E8DFC8]">
                  <button
                    onClick={() => setShowBareCode(false)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      !showBareCode
                        ? 'bg-[#2A8B83] text-white shadow-xs'
                        : 'text-[#6C6358] hover:text-[#2D2926]'
                    }`}
                  >
                    <span>🟢 Full Code (with Comments)</span>
                  </button>
                  <button
                    onClick={() => setShowBareCode(true)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      showBareCode
                        ? 'bg-[#0088FF] text-white shadow-xs'
                        : 'text-[#6C6358] hover:text-[#2D2926]'
                    }`}
                  >
                    <span>⚡ Bare Code Only</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopy}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                    isCopied
                      ? 'bg-[#34C759] text-white'
                      : 'bg-[#FAF6F0] hover:bg-[#F2ECE1] text-[#2D2926] border border-[#E6DFD5]'
                  }`}
                >
                  {isCopied ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>{showBareCode ? 'Copy Bare Code' : 'Copy Full Code'}</span>
                    </>
                  )}
                </button>

                <button
                  onClick={handleDownload}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-bold text-xs bg-[#0088FF] hover:bg-[#0070D1] text-white transition-all shadow-xs cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download {currentFilename.endsWith('.py') ? '.py' : '.ino'}</span>
                </button>
              </div>
            </div>

            {/* Syntax-styled Code Box */}
            <div className="relative rounded-2xl bg-[#081216] border-2 border-[#153E4A] p-4 overflow-hidden shadow-inner">
              <div className="flex items-center justify-between text-[#5C7F8C] pb-2 mb-2 border-b border-[#153E4A] text-[11px]">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500/80 inline-block" />
                  <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80 inline-block" />
                  <span className="w-2.5 h-2.5 rounded-full bg-green-500/80 inline-block" />
                  <span className="ml-2 text-gray-300 font-sans font-bold">
                    {activeTab.includes('py') ? 'Arduino App Lab (Python)' : 'Arduino IDE (C++)'}
                  </span>
                  {showBareCode && (
                    <span className="text-[10px] bg-blue-500/20 text-[#38BDF8] px-2 py-0.5 rounded font-bold">
                      Bare Executable Code (Comments Stripped)
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[#4ADE80] font-mono text-[10px] hidden sm:inline">
                    # Comments in green
                  </span>
                  <span className="text-[#88C6D4]">Target: 13×8 Blue Light Grid</span>
                </div>
              </div>

              <div className="overflow-x-auto max-h-[480px] scrollbar-thin scrollbar-thumb-[#1D4A57] scrollbar-track-transparent">
                <HighlightedCode code={currentCode} isPython={isPython} />
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Core Engineering Concepts */}
        {activeViewMode === 'concepts' && (
          <div className="mt-4 flex flex-col gap-4">
            <div className="p-4 rounded-2xl bg-[#FAF6F0] border border-[#EADBCE]">
              <h3 className="text-sm font-bold text-[#2D2926] flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[#2A8B83]" />
                Understanding Concepts
              </h3>
              <p className="text-xs text-[#6C6358] mt-1">
                Click any core concept below to understand what the code is doing under the hood on your Arduino UNO Q.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {[
                {
                  id: 'bitmap',
                  title: '2D Binary Bitmaps',
                  icon: Binary,
                  color: 'text-[#0088FF]',
                  bg: 'bg-blue-50',
                  summary: '1s and 0s mapped to row and column coordinates.',
                },
                {
                  id: 'timing',
                  title: 'Frame Timing & FPS',
                  icon: Clock,
                  color: 'text-amber-600',
                  bg: 'bg-amber-50',
                  summary: 'Converting delay milliseconds into smooth animation.',
                },
              ].map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedConcept(c.id)}
                  className={`p-3.5 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col gap-1.5 ${
                    selectedConcept === c.id
                      ? 'border-[#2A8B83] bg-white shadow-xs'
                      : 'border-[#EADBCE] bg-[#FAF6F0] hover:bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-7 h-7 rounded-xl ${c.bg} ${c.color} flex items-center justify-center`}>
                        <c.icon className="w-4 h-4" />
                      </div>
                      <span className="font-bold text-xs text-[#2D2926]">{c.title}</span>
                    </div>
                    {selectedConcept === c.id && <ChevronRight className="w-3.5 h-3.5 text-[#2A8B83]" />}
                  </div>
                  <p className="text-[11px] text-[#7A7167] leading-relaxed">
                    {c.summary}
                  </p>
                </button>
              ))}
            </div>

            {/* Selected Concept Detail Card */}
            <div className="p-5 rounded-2xl bg-white border-2 border-[#2A8B83]/30 shadow-xs flex flex-col gap-3">
              {selectedConcept === 'bitmap' && (
                <div>
                  <h4 className="font-bold text-sm text-[#2D2926] flex items-center gap-2">
                    <Binary className="w-4 h-4 text-[#0088FF]" />
                    How 2D Binary Bitmaps Control Hardware LEDs
                  </h4>
                  <p className="text-xs text-[#5A5248] mt-1.5 leading-relaxed">
                    In digital electronics, an LED is an optical semiconductor that turns on when voltage is applied.
                    In our code, every frame is represented as a 2D matrix of <span className="font-bold text-[#0088FF]">1</span>s and <span className="font-bold text-gray-500">0</span>s across 8 rows and 13 columns:
                  </p>
                  <div className="my-2.5 p-3 rounded-xl bg-[#081216] font-mono text-[11px] text-gray-200">
                    <span className="text-[#38BDF8]"># Row 0:</span> [0, 0, 1, 1, 0, 0, 0, 0, 1, 1, 0, 0, 0] <span className="text-gray-400">{'// 1 = High (3.3V, LED glows), 0 = Low (GND, dark)'}</span>
                  </div>
                  <p className="text-xs text-[#5A5248] leading-relaxed">
                    By stacking multiple 2D arrays into a 3D list (<code className="font-mono bg-gray-100 px-1 rounded">animation_frames</code> in Python or <code className="font-mono bg-gray-100 px-1 rounded">frames[TOTAL_FRAMES][8][13]</code> in C++), we create a digital flipbook that plays sequential frames!
                  </p>
                </div>
              )}

              {selectedConcept === 'dual_brain' && (
                <div>
                  <h4 className="font-bold text-sm text-[#2D2926] flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-[#2A8B83]" />
                    Dual-Brain Architecture: Qualcomm Dragonwing + STM32
                  </h4>
                  <p className="text-xs text-[#5A5248] mt-1.5 leading-relaxed">
                    The Arduino UNO Q is fundamentally different from older Arduino boards like the UNO R3 or R4. It features <span className="font-bold text-[#2D2926]">two chips working in tandem</span>:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 my-2.5">
                    <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200 text-xs">
                      <span className="font-bold text-[#0066CC] block mb-1">Qualcomm Dragonwing QRB2210 (MPU)</span>
                      <p className="text-[11px] text-[#4A5568]">
                        Runs Debian Linux, Python, WiFi/Bluetooth, camera computer vision, and the Arduino App Lab runtime. It thinks at the system level.
                      </p>
                    </div>
                    <div className="p-3 rounded-xl bg-teal-50/70 border border-teal-200 text-xs">
                      <span className="font-bold text-[#1D5E57] block mb-1">STM32U585 Microcontroller (MCU)</span>
                      <p className="text-[11px] text-[#4A5568]">
                        Ultra-low-power ARM Cortex-M33 handling cycle-accurate GPIO timing, PWM, and directly strobing the 13×8 LED light grid.
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-[#5A5248] leading-relaxed">
                    When you call <code className="font-mono bg-gray-100 px-1 rounded">matrix.render()</code> in Python, an internal high-speed Remote Procedure Call (RPC) bridge transmits the pixel data across processors in microseconds!
                  </p>
                </div>
              )}

              {selectedConcept === 'multiplexing' && (
                <div>
                  <h4 className="font-bold text-sm text-[#2D2926] flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#D9532F]" />
                    Matrix Multiplexing & Persistence of Vision (POV)
                  </h4>
                  <p className="text-xs text-[#5A5248] mt-1.5 leading-relaxed">
                    If each of the 104 LEDs required its own individual wire, the board would need 104 output pins! Instead, the UNO Q uses <span className="font-bold text-[#2D2926]">Matrix Multiplexing</span>:
                  </p>
                  <ul className="text-xs text-[#5A5248] list-disc list-inside space-y-1 my-2">
                    <li>All LEDs are connected across <strong>8 row lines</strong> (cathodes) and <strong>13 column lines</strong> (anodes). Total pins used: only <strong>21 lines</strong>!</li>
                    <li>The hardware driver turns on Row 0, sets the 13 columns, waits a fraction of a millisecond, then switches to Row 1, and so on.</li>
                    <li>Because human retinas retain visual images for approximately 1/16th of a second (<span className="italic">Persistence of Vision</span>), your brain fuses the rapid scan pulses into a solid, flicker-free picture!</li>
                  </ul>
                </div>
              )}

              {selectedConcept === 'memory' && (
                <div>
                  <h4 className="font-bold text-sm text-[#2D2926] flex items-center gap-2">
                    <Layers className="w-4 h-4 text-purple-600" />
                    Embedded Optimization: Why uint8_t Instead of int?
                  </h4>
                  <p className="text-xs text-[#5A5248] mt-1.5 leading-relaxed">
                    In desktop C++ programming, numbers are usually stored as 32-bit <code className="font-mono bg-gray-100 px-1 rounded">int</code> (which uses 4 bytes of RAM per value).
                    On embedded microcontrollers, RAM is measured in kilobytes, not gigabytes!
                  </p>
                  <div className="my-2 p-3 rounded-xl bg-purple-50 border border-purple-200 text-xs text-purple-900">
                    <span className="font-bold">Memory Comparison for 8 Animation Frames:</span>
                    <div className="mt-1 font-mono text-[11px]">
                      • Using int (32-bit): 8 frames × 104 pixels × 4 bytes = <strong>3,328 bytes</strong><br />
                      • Using uint8_t (8-bit): 8 frames × 104 pixels × 1 byte = <strong>832 bytes (75% savings!)</strong>
                    </div>
                  </div>
                  <p className="text-xs text-[#5A5248] leading-relaxed">
                    <code className="font-mono bg-gray-100 px-1 rounded">uint8_t</code> stands for <em>Unsigned Integer 8-bit</em> (values 0 to 255). Since our pixel values are only 0 or 1, uint8_t is the perfect efficient data type.
                  </p>
                </div>
              )}

              {selectedConcept === 'lifecycle' && (
                <div>
                  <h4 className="font-bold text-sm text-[#2D2926] flex items-center gap-2">
                    <Activity className="w-4 h-4 text-emerald-600" />
                    The Embedded Program Lifecycle: setup() and loop()
                  </h4>
                  <p className="text-xs text-[#5A5248] mt-1.5 leading-relaxed">
                    Embedded microcontrollers do not run an operating system window manager or exit to a desktop. They run an infinite loop powered by electricity:
                  </p>
                  <div className="space-y-2 my-2 text-xs text-[#5A5248]">
                    <div className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-200">
                      <strong>1. setup():</strong> Runs exactly once when the board boots up or is reset. Here we initialize Serial USB logging (<code className="font-mono">Serial.begin(115200)</code>) and power on the LED matrix driver (<code className="font-mono">matrix.begin()</code>).
                    </div>
                    <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200">
                      <strong>2. loop():</strong> Repeats forever until power is disconnected. We iterate over our array of animation frames, call render, and delay for our target frame duration.
                    </div>
                  </div>
                </div>
              )}

              {selectedConcept === 'timing' && (
                <div>
                  <h4 className="font-bold text-sm text-[#2D2926] flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-600" />
                    Frame Timing, Animation Cadence & FPS
                  </h4>
                  <p className="text-xs text-[#5A5248] mt-1.5 leading-relaxed">
                    Animation is the illusion of motion created by rapidly showing still images in sequence.
                    The speed is determined by your delay parameter:
                  </p>
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 my-2 text-xs text-amber-900 font-mono">
                    FPS (Frames Per Second) = 1000 / delay_milliseconds<br />
                    • 350ms delay = ~2.8 FPS (Standard pixel art cadence)<br />
                    • 150ms delay = ~6.6 FPS (Brisk walking / running motion)<br />
                    • 500ms delay = ~2.0 FPS (Slow relaxed heartbeat or breathing)
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 3: Command & API Cheat Sheet */}
        {activeViewMode === 'commands' && (
          <div className="mt-4 flex flex-col gap-4">
            <div className="p-4 rounded-2xl bg-[#FAF6F0] border border-[#EADBCE]">
              <h3 className="text-sm font-bold text-[#2D2926] flex items-center gap-2">
                <Sliders className="w-4 h-4 text-[#0088FF]" />
                Command & API Cheat Sheet for Arduino UNO Q
              </h3>
              <p className="text-xs text-[#6C6358] mt-1">
                Here are the essential commands used in your code and how Python and C++ correspond to each other.
              </p>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-[#E6DFD5]">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#FAF6F0] border-b border-[#E6DFD5] text-[#2D2926] font-bold">
                    <th className="p-3">Operation</th>
                    <th className="p-3">Python (App Lab)</th>
                    <th className="p-3">C++ (Arduino IDE)</th>
                    <th className="p-3">Hardware Purpose</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0EBE1] text-[#5A5248]">
                  <tr className="hover:bg-blue-50/30">
                    <td className="p-3 font-semibold text-[#2D2926]">Hardware Init</td>
                    <td className="p-3 font-mono text-[#0088FF]">matrix.begin()</td>
                    <td className="p-3 font-mono text-[#D9532F]">matrix.begin()</td>
                    <td className="p-3">Wakes up display controller, starts multiplexing clock timer.</td>
                  </tr>
                  <tr className="hover:bg-blue-50/30">
                    <td className="p-3 font-semibold text-[#2D2926]">Render Frame</td>
                    <td className="p-3 font-mono text-[#0088FF]">matrix.render(frame)</td>
                    <td className="p-3 font-mono text-[#D9532F]">matrix.renderBitmap(frame, 8, 13)</td>
                    <td className="p-3">Transfers the 8×13 binary array to the physical LED drivers.</td>
                  </tr>
                  <tr className="hover:bg-blue-50/30">
                    <td className="p-3 font-semibold text-[#2D2926]">Clear Screen</td>
                    <td className="p-3 font-mono text-[#0088FF]">matrix.clear()</td>
                    <td className="p-3 font-mono text-[#D9532F]">matrix.clear()</td>
                    <td className="p-3">Sets all 104 LEDs to 0 (dark) immediately.</td>
                  </tr>
                  <tr className="hover:bg-blue-50/30">
                    <td className="p-3 font-semibold text-[#2D2926]">Pause / Delay</td>
                    <td className="p-3 font-mono text-[#0088FF]">time.sleep(0.35)</td>
                    <td className="p-3 font-mono text-[#D9532F]">delay(350)</td>
                    <td className="p-3">Pauses processor execution for a set duration (seconds vs ms).</td>
                  </tr>
                  <tr className="hover:bg-blue-50/30">
                    <td className="p-3 font-semibold text-[#2D2926]">Debug Logging</td>
                    <td className="p-3 font-mono text-[#0088FF]">print("...")</td>
                    <td className="p-3 font-mono text-[#D9532F]">Serial.println("...")</td>
                    <td className="p-3">Streams telemetry over USB serial cable to your laptop terminal.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 4: Hacker Experiments */}
        {activeViewMode === 'challenges' && (
          <div className="mt-4 flex flex-col gap-4">
            <div className="p-4 rounded-2xl bg-[#FFF8F5] border border-[#FAD7CE]">
              <h3 className="text-sm font-bold text-[#8A341E] flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-[#D9532F]" />
                DIY Hacker Challenges (Try These on Your Board!)
              </h3>
              <p className="text-xs text-[#A64E38] mt-1">
                Don't just copy and paste! Try tweaking these specific lines of code on your laptop to experiment with how code affects physical light.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              <div className="p-4 rounded-2xl bg-white border border-[#E6DFD5] shadow-xs flex flex-col justify-between gap-3">
                <div>
                  <div className="w-8 h-8 rounded-xl bg-orange-100 text-[#D9532F] flex items-center justify-center font-bold text-xs mb-2">
                    1
                  </div>
                  <h4 className="font-bold text-sm text-[#2D2926]">Speed Tuning (FPS)</h4>
                  <p className="text-xs text-[#6C6358] mt-1 leading-relaxed">
                    Find the line <code className="font-mono bg-gray-100 px-1 rounded">FRAME_DELAY</code>.
                  </p>
                  <div className="my-2 p-2 rounded-lg bg-gray-50 border font-mono text-[11px] text-gray-800">
                    FRAME_DELAY = 0.10  # Hyper fast arcade mode!<br />
                    FRAME_DELAY = 0.80  # Slow ambient glow
                  </div>
                  <p className="text-[11px] text-[#7A7167]">
                    Notice how changing time changes the perceived emotion and energy of your character!
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-[#E6DFD5] shadow-xs flex flex-col justify-between gap-3">
                <div>
                  <div className="w-8 h-8 rounded-xl bg-blue-100 text-[#0088FF] flex items-center justify-center font-bold text-xs mb-2">
                    2
                  </div>
                  <h4 className="font-bold text-sm text-[#2D2926]">Inverted Silhouette</h4>
                  <p className="text-xs text-[#6C6358] mt-1 leading-relaxed">
                    Try swapping all <span className="font-bold text-[#0088FF]">1</span>s for <span className="font-bold text-gray-600">0</span>s and vice versa!
                  </p>
                  <div className="my-2 p-2 rounded-lg bg-gray-50 border font-mono text-[11px] text-gray-800">
                    # Invert frame in Python:<br />
                    inverted = [[1 - val for val in row] for row in frame]
                  </div>
                  <p className="text-[11px] text-[#7A7167]">
                    The entire light grid will flood with blue light while your icon is carved out of shadows.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-[#E6DFD5] shadow-xs flex flex-col justify-between gap-3">
                <div>
                  <div className="w-8 h-8 rounded-xl bg-teal-100 text-[#2A8B83] flex items-center justify-center font-bold text-xs mb-2">
                    3
                  </div>
                  <h4 className="font-bold text-sm text-[#2D2926]">Ping-Pong Boomerang Loop</h4>
                  <p className="text-xs text-[#6C6358] mt-1 leading-relaxed">
                    Normally, loops jump from the last frame back to the first frame. Make it bounce back and forth smoothly!
                  </p>
                  <div className="my-2 p-2 rounded-lg bg-gray-50 border font-mono text-[11px] text-gray-800">
                    # Python boomerang list:<br />
                    full_loop = frames + frames[-2:0:-1]
                  </div>
                  <p className="text-[11px] text-[#7A7167]">
                    Frames will play 0 &rarr; 1 &rarr; 2 &rarr; 1 &rarr; 0, creating a fluid perpetual breathing animation.
                  </p>
                </div>
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
};

