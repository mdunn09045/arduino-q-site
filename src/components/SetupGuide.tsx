import React from 'react';
import { Terminal, ExternalLink } from 'lucide-react';

export const SetupGuide: React.FC = () => {
  return (
    <div className="bg-white rounded-3xl p-6 border border-[#E6DFD5] shadow-xs flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#0088FF]/10 text-[#0088FF] flex items-center justify-center font-bold">
            <Terminal className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-bold text-[#2D2926]">
              Arduino UNO Q Setup
            </h3>
            <p className="text-xs text-[#7A7167]">
              4 quick steps to flash your 13×8 light grid
            </p>
          </div>
        </div>

        <a
          href="https://www.arduino.cc/en/software/#app-lab-section"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-bold px-3 py-1.5 rounded-xl bg-[#FAF6F0] hover:bg-[#E8F2FF] text-[#0066CC] border border-[#E6DFD5] flex items-center gap-1.5 transition-colors"
          title="Open official Arduino App Lab download page"
        >
          <span>Download App Lab</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      {/* 4 Steps Grid (2x2 layout is clean & comfortable on the left column) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {/* Step 1 */}
        <div className="p-4 rounded-2xl bg-[#FAF6F0] border border-[#EADBCE] flex flex-col gap-2 hover:border-[#0088FF]/40 transition-colors">
          <div className="flex items-center justify-between">
            <div className="w-6 h-6 rounded-lg bg-[#0088FF] text-white font-bold text-xs flex items-center justify-center">
              1
            </div>
            <span className="text-[10px] font-mono text-[#8C8275] uppercase">Hardware</span>
          </div>
          <h4 className="font-bold text-sm text-[#2D2926]">Connect via USB-C</h4>
          <p className="text-xs text-[#6C6358] leading-relaxed">
            Plug the Arduino UNO Q into your laptop with a USB-C data cable. 
          </p>
        </div>

        {/* Step 2 */}
        <div className="p-4 rounded-2xl bg-[#FAF6F0] border border-[#EADBCE] flex flex-col gap-2 hover:border-[#0088FF]/40 transition-colors">
          <div className="flex items-center justify-between">
            <div className="w-6 h-6 rounded-lg bg-[#0088FF] text-white font-bold text-xs flex items-center justify-center">
              2
            </div>
            <span className="text-[10px] font-mono text-[#8C8275] uppercase">Software</span>
          </div>
          <h4 className="font-bold text-sm text-[#2D2926]">Open Arduino App Lab</h4>
          <p className="text-xs text-[#6C6358] leading-relaxed">
            Launch <span className="font-bold text-[#2D2926]">Arduino App Lab</span>. It discovers your UNO Q automatically over USB or local network.
          </p>
          <a
            href="https://www.arduino.cc/en/software/#app-lab-section"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs font-bold text-[#0066CC] hover:text-[#004C99] hover:underline mt-auto pt-1"
          >
            <span>Download App Lab</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        {/* Step 3 */}
        <div className="p-4 rounded-2xl bg-[#FAF6F0] border border-[#EADBCE] flex flex-col gap-2 hover:border-[#0088FF]/40 transition-colors">
          <div className="flex items-center justify-between">
            <div className="w-6 h-6 rounded-lg bg-[#0088FF] text-white font-bold text-xs flex items-center justify-center">
              3
            </div>
            <span className="text-[10px] font-mono text-[#8C8275] uppercase">Target</span>
          </div>
          <h4 className="font-bold text-sm text-[#2D2926]">Choose Python or C++</h4>
          <p className="text-xs text-[#6C6358] leading-relaxed">
            Copy code from the <span className="font-bold text-[#0066CC]">Code Generator</span> on the right. Run Python script if you do not have hardware, or paste C++ sketch into Arduino App Lab.
          </p>
        </div>

        {/* Step 4 */}
        <div className="p-4 rounded-2xl bg-[#FAF6F0] border border-[#EADBCE] flex flex-col gap-2 hover:border-[#2A8B83]/40 transition-colors">
          <div className="flex items-center justify-between">
            <div className="w-6 h-6 rounded-lg bg-[#2A8B83] text-white font-bold text-xs flex items-center justify-center">
              4
            </div>
            <span className="text-[10px] font-mono text-[#2A8B83] uppercase">Launch</span>
          </div>
          <h4 className="font-bold text-sm text-[#2D2926]">Light Up 13×8 Grid!</h4>
          <p className="text-xs text-[#6C6358] leading-relaxed">
            Hit <span className="font-bold text-[#0088FF]">Run</span>. All 104 blue LEDs illuminate your custom animation sequence in real time!
          </p>
        </div>
      </div>
    </div>
  );
};
