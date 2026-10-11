import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { renderScrollingNameFrames } from './src/utils/pixelFont.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isProd = process.env.NODE_ENV === 'production';
const PORT = Number(process.env.PORT) || 3000;

const app = express();
app.use(express.json());

// Morse Code dictionary
const MORSE_MAP: Record<string, string> = {
  A: '.-', B: '-...', C: '-.-.', D: '-..', E: '.', F: '..-.',
  G: '--.', H: '....', I: '..', J: '.---', K: '-.-', L: '.-..',
  M: '--', N: '-.', O: '---', P: '.--.', Q: '--.-', R: '.-.',
  S: '...', T: '-', U: '..-', V: '...-', W: '.--', X: '-..-',
  Y: '-.--', Z: '--..',
  '1': '.----', '2': '..---', '3': '...--', '4': '....-', '5': '.....',
  '6': '-....', '7': '--...', '8': '---..', '9': '----.', '0': '-----',
  ' ': '/', '?': '..--..', '!': '-.-.--', '.': '.-.-.-', ',': '--..--',
};

// API Route: Quick Pixel Art / Animation helper (no external API or key needed)
app.post('/api/generate-pixel-art', async (req, res) => {
  try {
    const { prompt, width = 13, height = 8, frameCount = 2 } = req.body;

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const p = String(prompt).toLowerCase().trim();
    const rows = 8;
    const cols = 13;
    const fallbackFrames = Math.min(Math.max(Number(frameCount) || 2, 1), 16);

    // Only spell a name if the attendee explicitly asks to spell a name or words
    const isExplicitSpellRequest = /\b(spell|my name is|name is|name:|spell:)\b/i.test(p);
    if (isExplicitSpellRequest) {
      const cleanedWord = p
        .replace(/spell|my name is|name is|name:|name|write|letters|text|lights|on the grid|please|display|arduino uno q|arduino|uno q/gi, '')
        .replace(/[^a-zA-Z0-9 ]/g, '')
        .trim();

      if (cleanedWord.length >= 2 && cleanedWord.length <= 16) {
        const nameUpper = cleanedWord.toUpperCase();
        const scrollFrames = renderScrollingNameFrames(nameUpper, cols, rows);
        return res.json({
          title: `Name: ${nameUpper}`,
          description: `Scrolling light grid marquee spelling "${nameUpper}" on the Arduino Uno Q`,
          frameDelayMs: 180,
          frames: scrollFrames.slice(0, 24),
          fallback: true,
          fallbackReason: 'Direct marquee rendering',
        });
      }
    }

    let f1: number[][];
    let f2: number[][];
    let fSequence: number[][][] | null = null;
    let title = `Pixel Art`;
    let description = `Animated pixel art for "${p}"`;
    let frameDelayMs = 350;

    if (p.includes('wisp') || p.includes('infinity') || p.includes('loop') || p.includes('orbit')) {
      title = 'Infinity Wisp Trail';
      description = 'Floating glowing ball with tapering light trail in an infinity loop';
      frameDelayMs = 90;
      const wispPath = [
        { head: [[6,3],[7,3],[6,4]], mid: [[5,4]], tail: [[4,5]] },
        { head: [[7,2],[8,2],[8,3]], mid: [[6,3]], tail: [[5,4]] },
        { head: [[9,1],[10,1],[9,2]], mid: [[8,2]], tail: [[7,3]] },
        { head: [[10,1],[11,2],[10,2]], mid: [[9,1]], tail: [[8,2]] },
        { head: [[11,3],[11,4],[10,3]], mid: [[11,2]], tail: [[10,1]] },
        { head: [[11,4],[10,5],[10,4]], mid: [[11,3]], tail: [[11,2]] },
        { head: [[9,5],[8,5],[9,4]], mid: [[10,5]], tail: [[11,4]] },
        { head: [[7,4],[6,4],[7,5]], mid: [[8,5]], tail: [[9,5]] },
        { head: [[5,3],[6,3],[6,4]], mid: [[7,4]], tail: [[8,5]] },
        { head: [[4,2],[3,2],[4,3]], mid: [[5,3]], tail: [[6,4]] },
        { head: [[2,1],[3,1],[3,2]], mid: [[4,2]], tail: [[5,3]] },
        { head: [[1,2],[2,1],[2,2]], mid: [[3,1]], tail: [[4,2]] },
        { head: [[1,3],[1,4],[2,3]], mid: [[1,2]], tail: [[2,1]] },
        { head: [[1,4],[2,5],[2,4]], mid: [[1,3]], tail: [[1,2]] },
        { head: [[3,5],[4,5],[3,4]], mid: [[2,5]], tail: [[1,4]] },
        { head: [[5,4],[6,4],[5,5]], mid: [[4,5]], tail: [[3,5]] },
      ];
      fSequence = wispPath.map(f => {
        const grid = Array.from({ length: 8 }, () => Array(13).fill(0));
        for (const [x, y] of f.head) grid[y][x] = 1;
        for (const [x, y] of f.mid) grid[y][x] = 1;
        for (const [x, y] of f.tail) grid[y][x] = 1;
        return grid;
      });
      f1 = fSequence[0];
      f2 = fSequence[1];
    } else if (p.includes('rocket') || p.includes('spaceship') || p.includes('space') || p.includes('launch')) {
      title = 'Flying Rocket';
      description = 'Rocket ascending with animated flaming thrusters';
      frameDelayMs = 280;
      f1 = [
        [0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0],
        [0, 0, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0],
        [0, 0, 0, 1, 1, 0, 1, 0, 1, 1, 0, 0, 0],
        [0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0],
      ];
      f2 = [
        [0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0],
        [0, 0, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0],
        [0, 0, 0, 1, 1, 0, 1, 0, 1, 1, 0, 0, 0],
        [0, 0, 0, 0, 1, 0, 1, 0, 1, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0],
      ];
    } else if (p.includes('robot') || p.includes('bot') || p.includes('droid')) {
      title = 'Retro Robot';
      description = 'Blinking retro robot with antenna';
      frameDelayMs = 380;
      f1 = [
        [0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0],
        [0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0],
        [1, 0, 1, 0, 1, 1, 1, 1, 1, 0, 1, 0, 1],
        [1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1],
        [0, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 0],
        [0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0],
        [0, 0, 0, 1, 1, 0, 0, 0, 1, 1, 0, 0, 0],
      ];
      f2 = [
        [0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0],
        [0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0],
        [1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1],
        [1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1],
        [0, 0, 1, 1, 0, 1, 0, 1, 0, 1, 1, 0, 0],
        [0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0],
        [0, 0, 0, 1, 1, 0, 0, 0, 1, 1, 0, 0, 0],
      ];
    } else if (p.includes('alien') || p.includes('invader') || p.includes('ufo')) {
      title = 'Space Invader';
      description = 'Classic 8-bit space invader';
      frameDelayMs = 320;
      f1 = [
        [0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0],
        [0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0],
        [0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0],
        [0, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 0],
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        [1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1],
        [1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1],
        [0, 0, 0, 1, 1, 0, 0, 0, 1, 1, 0, 0, 0],
      ];
      f2 = [
        [0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0],
        [1, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 1],
        [1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1],
        [1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 1],
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        [0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0],
        [0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0],
        [0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0],
      ];
    } else if (p.includes('frog') || p.includes('toad')) {
      title = 'Bouncing Frog';
      description = 'Cute frog with wide glowing eyes';
      frameDelayMs = 380;
      f1 = [
        [0, 0, 1, 1, 0, 0, 0, 0, 0, 1, 1, 0, 0],
        [0, 1, 0, 1, 1, 0, 0, 0, 1, 1, 0, 1, 0],
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        [1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1],
        [0, 1, 0, 0, 1, 1, 1, 1, 1, 0, 0, 1, 0],
        [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
        [1, 1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 1],
      ];
      f2 = [
        [0, 0, 1, 1, 0, 0, 0, 0, 0, 1, 1, 0, 0],
        [0, 1, 1, 1, 1, 0, 0, 0, 1, 1, 1, 1, 0],
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        [1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1],
        [1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1],
        [0, 1, 0, 0, 1, 1, 1, 1, 1, 0, 0, 1, 0],
        [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
        [0, 1, 1, 0, 0, 1, 1, 1, 0, 0, 1, 1, 0],
      ];
    } else if (p.includes('sun') || p.includes('sunny') || p.includes('solar')) {
      title = 'Radiant Sun';
      description = 'Bright sun with animated radiating rays';
      frameDelayMs = 350;
      f1 = [
        [0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0],
        [0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0],
        [0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0],
        [0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0],
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        [0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0],
        [0, 1, 0, 1, 1, 1, 1, 1, 1, 1, 0, 1, 0],
        [0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0],
      ];
      f2 = [
        [0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0],
        [0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0],
        [0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0],
        [1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1],
        [0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0],
        [1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1],
        [0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0],
        [0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0],
      ];
    } else if (p.includes('moon') || p.includes('crescent')) {
      title = 'Crescent Moon';
      description = 'Crescent moon with twinkling night stars';
      frameDelayMs = 400;
      f1 = [
        [0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0],
        [0, 1, 0, 0, 1, 1, 1, 0, 0, 0, 0, 1, 0],
        [0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 1, 0, 0],
        [0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0],
        [0, 1, 0, 0, 1, 1, 1, 0, 0, 0, 0, 1, 0],
        [0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      ];
      f2 = [
        [0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 1, 0],
        [0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0],
        [0, 1, 0, 1, 1, 1, 0, 0, 0, 0, 1, 0, 0],
        [0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 1, 0, 1, 1, 1, 0, 0, 0, 0, 1, 0, 0],
        [0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 1, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      ];
    } else if (p.includes('car') || p.includes('truck') || p.includes('drive') || p.includes('race')) {
      title = 'Speeding Car';
      description = 'Racing pixel sports car with spinning wheels';
      frameDelayMs = 250;
      f1 = [
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0],
        [0, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 0, 0],
        [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        [0, 1, 1, 0, 1, 1, 1, 1, 0, 1, 1, 0, 0],
        [0, 0, 1, 1, 0, 0, 0, 1, 1, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      ];
      f2 = [
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0],
        [0, 0, 0, 1, 0, 1, 1, 0, 1, 0, 0, 0, 0],
        [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        [0, 1, 0, 1, 1, 1, 1, 0, 1, 1, 0, 0, 0],
        [0, 0, 0, 1, 1, 0, 0, 0, 1, 1, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      ];
    } else if (p.includes('music') || p.includes('note') || p.includes('song')) {
      title = 'Musical Note';
      description = 'Eighth note vibrating with melody';
      frameDelayMs = 350;
      f1 = [
        [0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 0],
        [0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 1, 0, 0],
        [0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0],
        [0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0],
        [0, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0],
      ];
      f2 = [
        [0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0],
        [0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 1, 0, 0],
        [0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0],
        [0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0],
        [0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0],
      ];
    } else if (p.includes('game') || p.includes('gameboy') || p.includes('arcade')) {
      title = 'Retro Game Console';
      description = 'Handheld console with animated screen';
      frameDelayMs = 380;
      f1 = [
        [0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0],
        [0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
        [0, 0, 1, 0, 1, 1, 1, 1, 0, 1, 0, 0, 0],
        [0, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 0, 0],
        [0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
        [0, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 0, 0],
        [0, 0, 1, 1, 1, 1, 0, 0, 1, 1, 0, 0, 0],
        [0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0],
      ];
      f2 = [
        [0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0],
        [0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
        [0, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0, 0, 0],
        [0, 0, 1, 0, 1, 1, 1, 1, 0, 1, 0, 0, 0],
        [0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
        [0, 0, 1, 0, 1, 0, 0, 0, 1, 1, 0, 0, 0],
        [0, 0, 1, 1, 1, 1, 0, 1, 0, 1, 0, 0, 0],
        [0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0],
      ];
    } else if (p.includes('butterfly') || p.includes('moth') || p.includes('wings')) {
      title = 'Graceful Butterfly';
      description = 'Fluttering butterfly on the Arduino Uno Q';
      frameDelayMs = 300;
      f1 = [
        [0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0],
        [1, 1, 1, 0, 0, 0, 1, 0, 0, 0, 1, 1, 1],
        [1, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 1],
        [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
        [0, 0, 1, 1, 1, 0, 1, 0, 1, 1, 1, 0, 0],
        [0, 1, 1, 1, 0, 0, 1, 0, 0, 1, 1, 1, 0],
        [1, 1, 1, 0, 0, 0, 1, 0, 0, 0, 1, 1, 1],
        [0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0],
      ];
      f2 = [
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0],
        [0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0],
        [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
        [0, 0, 1, 1, 1, 0, 1, 0, 1, 1, 1, 0, 0],
        [0, 0, 1, 1, 0, 0, 1, 0, 0, 1, 1, 0, 0],
        [0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      ];
    } else if (p.includes('button') || p.includes('sew') || p.includes('camera') || p.includes('icon') || p.includes('flower')) {
      title = 'Button, Camera, Scissors, Flower';
      description = 'Slow rotation of crisp monochrome silhouettes: button, camera, scissors & two flowers';
      frameDelayMs = 1600;
      f1 = [
        [0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0],
        [0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0],
        [0, 1, 0, 0, 1, 1, 0, 1, 1, 0, 0, 1, 0],
        [1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1],
        [1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1],
        [0, 1, 0, 0, 1, 1, 0, 1, 1, 0, 0, 1, 0],
        [0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0],
        [0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0],
      ];
      f2 = [
        [0, 0, 1, 1, 0, 0, 1, 1, 1, 1, 0, 0, 0],
        [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
        [0, 1, 0, 0, 0, 1, 1, 1, 1, 0, 0, 1, 0],
        [0, 1, 0, 0, 1, 0, 0, 0, 0, 1, 0, 1, 0],
        [0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 0, 1, 0],
        [0, 1, 0, 0, 1, 0, 0, 0, 0, 1, 0, 1, 0],
        [0, 1, 0, 0, 0, 1, 1, 1, 1, 0, 0, 1, 0],
        [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
      ];
    } else if (p.includes('cat') || p.includes('kitty') || p.includes('kitten')) {
      title = 'Cat';
      description = 'Cute cat with twitching multi-whiskers';
      frameDelayMs = 320;
      f1 = [
        [0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0],
        [0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0],
        [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
        [1, 1, 1, 0, 1, 0, 0, 0, 1, 0, 1, 1, 1],
        [1, 1, 1, 0, 0, 1, 1, 1, 0, 0, 1, 1, 1],
        [0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0],
        [0, 0, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      ];
      f2 = [
        [0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0],
        [0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0],
        [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
        [0, 0, 1, 0, 1, 0, 0, 0, 1, 0, 1, 0, 0],
        [1, 1, 1, 0, 0, 1, 1, 1, 0, 0, 1, 1, 1],
        [1, 1, 0, 1, 0, 0, 1, 0, 0, 1, 0, 1, 1],
        [0, 0, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      ];
    } else if (p.includes('dog') || p.includes('puppy')) {
      title = 'Happy Puppy';
      description = 'Playful puppy with floppy ears';
      frameDelayMs = 380;
      f1 = [
        [0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0],
        [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
        [0, 0, 1, 0, 1, 1, 1, 1, 0, 1, 1, 0, 0],
        [0, 0, 1, 1, 1, 0, 0, 1, 1, 1, 0, 0, 0],
        [0, 0, 0, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0],
        [0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      ];
      f2 = [
        [0, 0, 1, 1, 0, 0, 0, 0, 0, 1, 1, 0, 0],
        [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
        [0, 0, 1, 0, 1, 1, 1, 1, 0, 1, 1, 0, 0],
        [0, 0, 1, 1, 1, 0, 0, 1, 1, 1, 0, 0, 0],
        [0, 0, 0, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0],
        [0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      ];
    } else if (p.includes('fish') || p.includes('goldfish')) {
      title = 'Swimming Little Fish';
      description = 'Small fish swimming across the light grid';
      frameDelayMs = 240;
      f1 = [
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [1, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 1, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      ];
      f2 = [
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 1, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 1, 1, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 1],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      ];
    } else if (p.includes('duck')) {
      title = 'Hacker Duck';
      description = 'MLH yellow hacker duck waddling and quacking';
      frameDelayMs = 350;
      f1 = [
        [0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 1, 1, 0, 1, 1, 1, 1, 0],
        [0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 0],
        [0, 1, 1, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0],
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0],
        [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0],
        [0, 0, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0],
      ];
      f2 = [
        [0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 1, 1, 0, 1, 1, 1, 1, 0],
        [0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0],
        [0, 1, 1, 0, 0, 0, 1, 1, 1, 0, 1, 0, 0],
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0],
        [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0],
        [0, 0, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0],
      ];
    } else if (p.includes('sew') || p.includes('yarn') || p.includes('knit') || p.includes('stitch')) {
      title = 'Vintage Sewing Machine';
      description = 'Sewing machine stitching with needle moving up and down';
      frameDelayMs = 320;
      f1 = [
        [0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0],
        [0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0],
        [0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0],
        [0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0],
        [0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
        [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0],
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      ];
      f2 = [
        [0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0],
        [0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0],
        [0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0],
        [0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
        [0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0],
        [0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0],
        [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0],
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      ];
    } else if (p.includes('heart') || p.includes('love')) {
      title = 'Pulsing Heart';
      description = 'Glowing heart beating on the Arduino matrix';
      f1 = [
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 1, 1, 0, 0, 0, 0, 1, 1, 0, 0, 0],
        [0, 1, 1, 1, 1, 0, 0, 1, 1, 1, 1, 0, 0],
        [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0],
        [0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0],
        [0, 0, 0, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0],
        [0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0],
      ];
      f2 = [
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 0, 0],
        [0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0],
        [0, 0, 0, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0],
        [0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      ];
    } else if (p.includes('star') || p.includes('sparkle') || p.includes('night')) {
      title = '5-Pointed Star';
      description = 'Classic 5-pointed star sparkling on the light grid';
      f1 = [
        [0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0],
        [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
        [0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0],
        [0, 0, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0],
        [0, 0, 0, 1, 1, 0, 0, 0, 1, 1, 0, 0, 0],
        [0, 0, 1, 1, 0, 0, 0, 0, 0, 1, 1, 0, 0],
        [0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0],
      ];
      f2 = [
        [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1],
        [0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0],
        [0, 1, 1, 1, 1, 0, 1, 0, 1, 1, 1, 1, 0],
        [0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0],
        [0, 0, 0, 0, 1, 0, 1, 0, 1, 0, 0, 0, 0],
        [0, 0, 0, 1, 1, 0, 0, 0, 1, 1, 0, 0, 0],
        [0, 0, 1, 1, 0, 0, 0, 0, 0, 1, 1, 0, 0],
        [1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1],
      ];
    } else if (p.includes('coffee') || p.includes('tea') || p.includes('mug')) {
      title = 'Pour-Over Coffee';
      description = 'Fresh steaming coffee brew';
      f1 = [
        [0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0],
        [0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0],
        [0, 0, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0],
        [0, 0, 1, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0],
        [0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0],
        [0, 0, 0, 1, 1, 1, 1, 1, 0, 1, 1, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0],
      ];
      f2 = [
        [0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0],
        [0, 0, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0],
        [0, 0, 1, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0],
        [0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0],
        [0, 0, 0, 1, 1, 1, 1, 1, 0, 1, 1, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0],
      ];
    } else {
      title = `Pixel: ${p.slice(0, 16)}`;
      description = `Dynamic pixel animation for "${p}"`;
      // Sparkling geometric matrix pattern
      f1 = [
        [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0],
        [0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0],
        [1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1],
        [0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0],
        [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0],
        [0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0],
        [1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      ];
      f2 = [
        [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1],
        [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0],
        [0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0],
        [1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1],
        [0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0],
        [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0],
        [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      ];
    }

    const padToCols = (grid: number[][]) =>
      grid.map((row) => (row.length < cols ? [...row, ...Array(cols - row.length).fill(0)] : row.slice(0, cols)));

    const outputFrames: { matrix: number[][] }[] = [];
    if (fSequence && fSequence.length > 0) {
      const takeCount = fallbackFrames <= 2 ? fSequence.length : Math.min(fallbackFrames, fSequence.length);
      for (let i = 0; i < takeCount; i++) {
        outputFrames.push({ matrix: padToCols(fSequence[i]) });
      }
    } else {
      const totalToGenerate = Math.max(fallbackFrames, 2);
      for (let i = 0; i < totalToGenerate; i++) {
        outputFrames.push({ matrix: padToCols(i % 2 === 0 ? f1 : f2) });
      }
    }

    return res.json({
      title,
      description,
      frameDelayMs,
      frames: outputFrames,
      fallback: true,
      fallbackReason: 'Pattern generated',
    });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Server error' });
  }
});

// API Route: Morse code encoder & hardware timing
app.post('/api/morse-code', (req, res) => {
  try {
    const { text = '' } = req.body;
    const cleanText = String(text).toUpperCase().trim();
    
    const morseArray = cleanText.split('').map((char) => ({
      char,
      morse: MORSE_MAP[char] || '',
    }));

    const fullMorseString = morseArray.map((m) => m.morse || ' ').join(' ');

    return res.json({
      original: cleanText,
      morseString: fullMorseString,
      symbols: morseArray,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================
// Community Creations & Moderation Storage
// ==========================================
const dataDir = path.join(__dirname, 'data');
const creationsFilePath = path.join(dataDir, 'creations.json');

const INITIAL_CREATIONS = [
  {
    id: 'creation-kitty',
    title: 'Perky Pixel Kitty',
    author: 'CodeCrafter',
    createdAt: new Date().toISOString(),
    category: 'Cute',
    frameDelayMs: 380,
    reportsCount: 0,
    isReported: false,
    frames: [
      {
        matrix: [
          [0,1,0,0,0,0,0,0,0,0,1,0,0],
          [0,1,1,0,0,0,0,0,0,1,1,0,0],
          [0,1,1,1,1,1,1,1,1,1,1,0,0],
          [0,0,0,1,0,0,0,0,1,0,0,0,0],
          [1,1,0,0,0,1,1,0,0,0,1,1,0],
          [0,0,0,1,0,0,0,0,1,0,0,0,0],
          [0,0,0,0,1,1,1,1,0,0,0,0,0],
          [0,0,0,0,0,0,0,0,0,0,0,0,0]
        ]
      },
      {
        matrix: [
          [0,0,1,0,0,0,0,0,0,1,0,0,0],
          [0,1,1,0,0,0,0,0,0,1,1,0,0],
          [0,1,1,1,1,1,1,1,1,1,1,0,0],
          [0,0,0,1,0,0,0,0,1,0,0,0,0],
          [1,1,0,0,0,1,1,0,0,0,1,1,0],
          [0,0,0,1,0,0,0,0,1,0,0,0,0],
          [0,0,0,0,1,1,1,1,0,0,0,0,0],
          [0,0,0,0,0,0,0,0,0,0,0,0,0]
        ]
      }
    ]
  }
];

function getStoredCreations() {
  try {
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    if (!fs.existsSync(creationsFilePath)) {
      fs.writeFileSync(creationsFilePath, JSON.stringify(INITIAL_CREATIONS, null, 2));
      return INITIAL_CREATIONS;
    }
    const data = fs.readFileSync(creationsFilePath, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error reading creations file:', err);
    return INITIAL_CREATIONS;
  }
}

function saveStoredCreations(creations: any[]) {
  try {
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    fs.writeFileSync(creationsFilePath, JSON.stringify(creations, null, 2));
  } catch (err) {
    console.error('Error saving creations file:', err);
  }
}

// Routes for Community Creations:
app.get('/api/creations', (req, res) => {
  const creations = getStoredCreations();
  const isAdmin = req.query.admin === 'true';
  if (isAdmin) {
    return res.json(creations);
  }
  // Public view: auto-hide any reported items
  const publicCreations = creations.filter((c: any) => !c.isReported);
  return res.json(publicCreations);
});

app.post('/api/creations', (req, res) => {
  try {
    const { title, author, frames, frameDelayMs = 350, category = 'Community' } = req.body;
    if (!title || !frames || !Array.isArray(frames)) {
      return res.status(400).json({ error: 'Title and frames array are required' });
    }

    const newCreation = {
      id: `creation-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      title: String(title).slice(0, 40).trim(),
      author: String(author || 'Hacker').slice(0, 25).trim(),
      createdAt: new Date().toISOString(),
      category: String(category).slice(0, 20),
      frameDelayMs: Number(frameDelayMs) || 350,
      reportsCount: 0,
      isReported: false,
      frames: frames.slice(0, 32).map((f: any) => ({
        matrix: f.matrix || Array.from({ length: 8 }, () => Array(13).fill(0))
      }))
    };

    const creations = getStoredCreations();
    creations.unshift(newCreation);
    saveStoredCreations(creations);

    return res.status(201).json(newCreation);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/creations/:id/report', (req, res) => {
  try {
    const { id } = req.params;
    const creations = getStoredCreations();
    const item = creations.find((c: any) => c.id === id);
    if (!item) {
      return res.status(404).json({ error: 'Creation not found' });
    }

    item.reportsCount = (item.reportsCount || 0) + 1;
    item.isReported = true;
    saveStoredCreations(creations);

    return res.json({ success: true, item });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.delete('/api/creations/:id', (req, res) => {
  try {
    const { id } = req.params;
    let creations = getStoredCreations();
    const initialLen = creations.length;
    creations = creations.filter((c: any) => c.id !== id);

    if (creations.length === initialLen) {
      return res.status(404).json({ error: 'Creation not found' });
    }

    saveStoredCreations(creations);
    return res.json({ success: true, deletedId: id });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/creations/:id/dismiss-report', (req, res) => {
  try {
    const { id } = req.params;
    const creations = getStoredCreations();
    const item = creations.find((c: any) => c.id === id);
    if (!item) {
      return res.status(404).json({ error: 'Creation not found' });
    }

    item.reportsCount = 0;
    item.isReported = false;
    saveStoredCreations(creations);

    return res.json({ success: true, item });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

async function startServer() {
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
