import React from 'react';
import { Sparkles } from 'lucide-react';

export const Header: React.FC = () => {
  return (
    <header className="relative border-b border-[#E6DFD5] bg-[#FAF6F0] overflow-hidden">
      {/* Decorative top stripe in Grace Hopper Hacks event colors */}
      <div className="h-2 w-full bg-gradient-to-r from-[#D9532F] via-[#F4C430] via-[#2A8B83] to-[#E892A2]" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          {/* Event Title & Branding */}
          <div className="flex items-start gap-4">
            <div className="relative">
              {/* Illustrated grid badge icon */}
              <div className="w-13 h-13 rounded-2xl bg-[#0088FF]/10 border-2 border-[#0088FF] flex items-center justify-center shadow-xs">
                <div className="grid grid-cols-3 gap-1">
                  {[...Array(9)].map((_, i) => (
                    <div
                      key={i}
                      className={`w-1.5 h-1.5 rounded-xs ${
                        i % 2 === 0 ? 'bg-[#0088FF]' : 'bg-[#F4C430]'
                      }`}
                    />
                  ))}
                </div>
              </div>
              <span className="absolute -bottom-1 -right-1 text-xs">✨</span>
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold tracking-wide uppercase bg-[#D9532F] text-white shadow-2xs">
                  Grace Hopper Hacks
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#2A8B83]/15 text-[#1D7874] border border-[#2A8B83]/30">
                  Hosted by MLH
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#2D2926] mt-1 flex items-center gap-2">
                Arduino Uno Q Studio
              </h1>
              <p className="text-xs sm:text-sm text-[#6C6358] max-w-2xl">
                Generate pixel art, spell your name, and copy the C++ to your board for the light grid!
              </p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
