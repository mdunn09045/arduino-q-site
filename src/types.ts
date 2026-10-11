export type PixelGrid = number[][]; // rows of 0 or 1

export interface Frame {
  id: string;
  matrix: PixelGrid;
}

export interface AnimationProject {
  title: string;
  description: string;
  width: number;
  height: number;
  frameDelayMs: number;
  frames: Frame[];
}

export interface MorseSymbol {
  char: string;
  morse: string;
}

export interface PresetArt {
  id: string;
  title: string;
  emoji: string;
  description: string;
  category: 'event' | 'craft' | 'tech' | 'cute';
  frameDelayMs: number;
  frames: number[][][]; // [frameIndex][row][col]
}

export interface CommunityCreation {
  id: string;
  title: string;
  author: string;
  createdAt: string;
  category: string;
  frames: { matrix: number[][] }[];
  frameDelayMs: number;
  reportsCount: number;
  isReported: boolean;
}
