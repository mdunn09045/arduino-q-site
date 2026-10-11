export const MORSE_TABLE: Record<string, string> = {
  A: '.-', B: '-...', C: '-.-.', D: '-..', E: '.', F: '..-.',
  G: '--.', H: '....', I: '..', J: '.---', K: '-.-', L: '.-..',
  M: '--', N: '-.', O: '---', P: '.--.', Q: '--.-', R: '.-.',
  S: '...', T: '-', U: '..-', V: '...-', W: '.--', X: '-..-',
  Y: '-.--', Z: '--..',
  '0': '-----', '1': '.----', '2': '..---', '3': '...--', '4': '....-',
  '5': '.....', '6': '-....', '7': '--...', '8': '---..', '9': '----.',
  '.': '.-.-.-', ',': '--..--', '?': '..--..', '!': '-.-.--',
  '-': '-....-', '/': '-..-.', '@': '.--.-.', ' ': '/',
};

export interface MorseTimingItem {
  type: 'on' | 'off';
  durationMs: number;
  symbol: '.' | '-' | 'space' | 'word-space';
  char: string;
}

// Convert text to international morse string
export function textToMorse(text: string): string {
  return text
    .toUpperCase()
    .split('')
    .map((c) => MORSE_TABLE[c] || '')
    .join(' ');
}

// Convert text to timing pulses for realistic blinking and audio
export function textToMorseTimings(text: string, dotDurationMs = 120): MorseTimingItem[] {
  const dashDurationMs = dotDurationMs * 3;
  const intraCharGapMs = dotDurationMs;
  const interCharGapMs = dotDurationMs * 3;
  const wordGapMs = dotDurationMs * 7;

  const timings: MorseTimingItem[] = [];
  const upper = text.toUpperCase();

  for (let i = 0; i < upper.length; i++) {
    const char = upper[i];
    if (char === ' ') {
      timings.push({ type: 'off', durationMs: wordGapMs, symbol: 'word-space', char: ' ' });
      continue;
    }

    const morse = MORSE_TABLE[char];
    if (!morse) continue;

    for (let j = 0; j < morse.length; j++) {
      const sym = morse[j] as '.' | '-';
      const duration = sym === '.' ? dotDurationMs : dashDurationMs;
      timings.push({ type: 'on', durationMs: duration, symbol: sym, char });

      // Gap between elements of same letter
      if (j < morse.length - 1) {
        timings.push({ type: 'off', durationMs: intraCharGapMs, symbol: 'space', char });
      }
    }

    // Gap between letters
    if (i < upper.length - 1 && upper[i + 1] !== ' ') {
      timings.push({ type: 'off', durationMs: interCharGapMs, symbol: 'space', char });
    }
  }

  return timings;
}

// Web Audio API Morse Beep Player
class MorseAudioPlayer {
  private ctx: AudioContext | null = null;
  private osc: OscillatorNode | null = null;
  private gain: GainNode | null = null;

  private init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public playTone(frequency = 700) {
    this.init();
    if (!this.ctx) return;

    this.stopTone();

    this.osc = this.ctx.createOscillator();
    this.gain = this.ctx.createGain();

    this.osc.type = 'sine';
    this.osc.frequency.setValueAtTime(frequency, this.ctx.currentTime);

    // Smooth envelope attack to prevent clicking
    this.gain.gain.setValueAtTime(0, this.ctx.currentTime);
    this.gain.gain.linearRampToValueAtTime(0.18, this.ctx.currentTime + 0.015);

    this.osc.connect(this.gain);
    this.gain.connect(this.ctx.destination);
    this.osc.start();
  }

  public stopTone() {
    if (this.gain && this.ctx) {
      this.gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.015);
      setTimeout(() => {
        try {
          this.osc?.stop();
          this.osc?.disconnect();
          this.gain?.disconnect();
        } catch {}
        this.osc = null;
        this.gain = null;
      }, 25);
    }
  }
}

export const morseAudio = new MorseAudioPlayer();

// Render Morse string onto a 13x8 LED matrix
// Displays dots as 2x2 blocks and dashes as 4x2 blocks
export function morseToMatrixFrame(morseStr: string, activeSymbolIndex = -1): number[][] {
  const grid: number[][] = Array.from({ length: 8 }, () => Array(13).fill(0));
  
  // Clean tokens
  const tokens = morseStr.split(' ').filter(Boolean);
  if (tokens.length === 0) return grid;

  // Center display or show current token / letters
  // Row 1-2: Progress bar / indicator
  // Row 3-4: Current symbol representation
  // Let's create a clear visual:
  // If active symbol given, draw it large
  // Or draw the dots and dashes across the rows
  let col = 1;
  const row = 3;

  for (let i = 0; i < morseStr.length; i++) {
    const char = morseStr[i];
    if (col >= 12) break;

    if (char === '.') {
      grid[row][col] = 1;
      grid[row + 1][col] = 1;
      col += 2;
    } else if (char === '-') {
      if (col <= 9) {
        grid[row][col] = 1;
        grid[row][col + 1] = 1;
        grid[row][col + 2] = 1;
        grid[row + 1][col] = 1;
        grid[row + 1][col + 1] = 1;
        grid[row + 1][col + 2] = 1;
        col += 4;
      }
    } else if (char === ' ') {
      col += 1;
    }
  }

  // Draw decorative border frame
  for (let c = 0; c < 13; c++) {
    grid[0][c] = c % 2 === 0 ? 1 : 0;
    grid[7][c] = c % 2 === 0 ? 1 : 0;
  }

  return grid;
}
