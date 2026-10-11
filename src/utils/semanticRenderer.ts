import { SemanticAnimationPlan, SemanticMotion, SemanticSpeed } from '../types/pixelScene';

export const MATRIX_ROWS = 8;
export const MATRIX_COLS = 13;

/**
 * Creates an empty 8x13 grid
 */
export function createEmptyGrid(): number[][] {
  return Array.from({ length: MATRIX_ROWS }, () => Array(MATRIX_COLS).fill(0));
}

/**
 * Stable 32-bit string hash (DJB2)
 */
export function hashString(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

/**
 * Converts an array of 8 strings of 13 chars ('.' and '#') into a 2D binary grid
 */
export function rowsToGrid(rows: string[]): number[][] {
  const grid = createEmptyGrid();
  for (let r = 0; r < Math.min(rows.length, MATRIX_ROWS); r++) {
    const rowStr = rows[r] || '';
    for (let c = 0; c < Math.min(rowStr.length, MATRIX_COLS); c++) {
      grid[r][c] = rowStr[c] === '#' ? 1 : 0;
    }
  }
  return grid;
}

// ---------------------------------------------------------------------------
// 🎨 SPRITE REPOSITORY (13 columns x 8 rows, with multiple variants)
// ---------------------------------------------------------------------------
interface SubjectDefinition {
  title: string;
  defaultMotion: SemanticMotion;
  variants: string[][]; // 4 variants, each 8 rows of 13 chars
}

const SPRITE_CATALOG: Record<string, SubjectDefinition> = {
  heart: {
    title: 'Heart',
    defaultMotion: 'pulse',
    variants: [
      // Var 0: Classic bold heart
      [
        '..###...###..',
        '.#####.#####.',
        '#############',
        '#############',
        '.###########.',
        '..#########..',
        '...#######...',
        '.....###.....',
      ],
      // Var 1: Outline heart
      [
        '..###...###..',
        '.#...#.#...#.',
        '#.....#.....#',
        '#...........#',
        '.#.........#.',
        '..#.......#..',
        '...#.....#...',
        '.....###.....',
      ],
      // Var 2: Compact mini heart
      [
        '.............',
        '....##.##....',
        '...#######...',
        '...#######...',
        '....#####....',
        '.....###.....',
        '......#......',
        '.............',
      ],
      // Var 3: Double mini hearts
      [
        '.##.##.......',
        '#######..##.#',
        '.#####..#####',
        '..###....###.',
        '...#......#..',
        '.............',
        '.............',
        '.............',
      ],
    ],
  },
  dot: {
    title: 'Dot Indicator',
    defaultMotion: 'blink',
    variants: [
      // Var 0: Centered 2x2 dot
      [
        '.............',
        '.............',
        '.............',
        '.....##......',
        '.....##......',
        '.............',
        '.............',
        '.............',
      ],
      // Var 1: Single center LED
      [
        '.............',
        '.............',
        '.............',
        '......#......',
        '.............',
        '.............',
        '.............',
        '.............',
      ],
      // Var 2: 3x3 circular dot
      [
        '.............',
        '......#......',
        '.....###.....',
        '.....###.....',
        '......#......',
        '.............',
        '.............',
        '.............',
      ],
      // Var 3: Ring dot
      [
        '.....###.....',
        '....#...#....',
        '...#.....#...',
        '...#..#..#...',
        '...#.....#...',
        '....#...#....',
        '.....###.....',
        '.............',
      ],
    ],
  },
  coffee: {
    title: 'Steaming Coffee',
    defaultMotion: 'rise',
    variants: [
      // Var 0: Coffee mug with steam
      [
        '....#...#....',
        '...#.....#...',
        '....#...#....',
        '..########...',
        '..#......#.#.',
        '..#......##..',
        '..#......#...',
        '...######....',
      ],
      // Var 1: Espresso cup
      [
        '.....#.#.....',
        '......#......',
        '.............',
        '....######...',
        '....#....#.#.',
        '....#....##..',
        '.....####....',
        '....######...',
      ],
      // Var 2: Takeaway cup
      [
        '....#####....',
        '...#######...',
        '....#####....',
        '....#...#....',
        '....#...#....',
        '....#...#....',
        '.....###.....',
        '.............',
      ],
      // Var 3: Teacup on saucer
      [
        '......#......',
        '.....#.#.....',
        '....######...',
        '....#....#.#.',
        '.....####....',
        '..##########.',
        '.............',
        '.............',
      ],
    ],
  },
  cat: {
    title: 'Cat',
    defaultMotion: 'blink',
    variants: [
      // Var 0: Waving cat
      [
        '..#.......#..',
        '.###.....###.',
        '.###########.',
        '.#.#.....#.#.',
        '.###########.',
        '..###.#.###.#',
        '...#######.##',
        '....#####....',
      ],
      // Var 1: Big chibi cat face
      [
        '.#.........#.',
        '###.......###',
        '#############',
        '#.#.......#.#',
        '#############',
        '..#########..',
        '...#######...',
        '....#####....',
      ],
      // Var 2: Sleeping cat
      [
        '.............',
        '..#...#......',
        '.#######.....',
        '.#-#-#-#.....',
        '#############',
        '..#########..',
        '....#####....',
        '.............',
      ],
      // Var 3: Curious cat
      [
        '..#.....#....',
        '.###...###...',
        '.#########...',
        '.#.#.#.#.#...',
        '.#########...',
        '..###.###....',
        '...#####.....',
        '.............',
      ],
    ],
  },
  dog: {
    title: 'Puppy',
    defaultMotion: 'bounce',
    variants: [
      // Var 0: Puppy face
      [
        '.##.......##.',
        '.###.###.###.',
        '..#########..',
        '..#.#...#.#..',
        '..#########..',
        '...###.###...',
        '....#####....',
        '.....###.....',
      ],
      // Var 1: Wagging puppy
      [
        '.##.......##.',
        '.###########.',
        '..#.#...#.#..',
        '..#########..',
        '...#######.##',
        '....#####..#.',
        '.....###.....',
        '.............',
      ],
      // Var 2: Floppy ears
      [
        '###.......###',
        '###..###..###',
        '.###########.',
        '.#.#.....#.#.',
        '..#########..',
        '...###.###...',
        '....#####....',
        '.............',
      ],
      // Var 3: Barking pup
      [
        '..##.....##..',
        '.###.###.###.',
        '..#########..',
        '..#.#...#.#..',
        '...#######...',
        '...#.....#...',
        '....#####....',
        '.............',
      ],
    ],
  },
  fish: {
    title: 'Swimming Fish',
    defaultMotion: 'wave',
    variants: [
      // Var 0: Streamlined fish
      [
        '.....####....',
        '..########...',
        '.##.#.#####.#',
        '#############',
        '#############',
        '.##########.#',
        '..########...',
        '.....####....',
      ],
      // Var 1: Cute chubby goldfish
      [
        '.............',
        '....#####....',
        '..########.#.',
        '.###.#.#####.',
        '############.',
        '.#########.#.',
        '....#####....',
        '.............',
      ],
      // Var 2: Mini fish school
      [
        '..###........',
        '.#####.#.....',
        '..###........',
        '.............',
        '.......###...',
        '......#####.#',
        '.......###...',
        '.............',
      ],
      // Var 3: Deep sea fish
      [
        '......#......',
        '....####.....',
        '..########...',
        '.##.#.#####.#',
        '#############',
        '..########...',
        '....####.....',
        '.............',
      ],
    ],
  },
  butterfly: {
    title: 'Butterfly',
    defaultMotion: 'pulse',
    variants: [
      // Var 0: Wide wings
      [
        '..#.......#..',
        '.###.....###.',
        '######.######',
        '.####...####.',
        '..##..#..##..',
        '.###..#..###.',
        '..#...#...#..',
        '......#......',
      ],
      // Var 1: Compact moth
      [
        '....#...#....',
        '...##.#.##...',
        '..########...',
        '..########...',
        '...######....',
        '....####.....',
        '.....##......',
        '.............',
      ],
      // Var 2: Swallowtail
      [
        '#...........#',
        '##.........##',
        '####..#..####',
        '.###..#..###.',
        '..##..#..##..',
        '.###..#..###.',
        '#.#.......#.#',
        '#...........#',
      ],
      // Var 3: Flying side-view
      [
        '.....#.......',
        '....###......',
        '...#####.....',
        '..#######....',
        '....###......',
        '.....#.......',
        '.............',
        '.............',
      ],
    ],
  },
  duck: {
    title: 'Duck',
    defaultMotion: 'bounce',
    variants: [
      // Var 0: Hacker duck
      [
        '....####.....',
        '...######....',
        '.######.#....',
        '..#######....',
        '...########..',
        '..##########.',
        '..##########.',
        '...########..',
      ],
      // Var 1: Bobbing duckling
      [
        '.............',
        '.....###.....',
        '...#####.#...',
        '....#####....',
        '..########...',
        '..########...',
        '...######....',
        '.............',
      ],
      // Var 2: Swimming duck
      [
        '....####.....',
        '.######.#....',
        '..#######....',
        '..##########.',
        '..##########.',
        '#.##########.',
        '.#.#.#.#.#.#.',
        '.............',
      ],
      // Var 3: Quacking duck
      [
        '....####.....',
        '..#..#.#.#...',
        '.##.######...',
        '..#######....',
        '...########..',
        '..##########.',
        '...########..',
        '.............',
      ],
    ],
  },
  flower: {
    title: 'Flower',
    defaultMotion: 'pulse',
    variants: [
      // Var 0: Blooming tulip
      [
        '....#####....',
        '...#######...',
        '..###.#.###..',
        '...#######...',
        '....#####....',
        '......#......',
        '....###......',
        '......#......',
      ],
      // Var 1: Daisy
      [
        '..#...#...#..',
        '...#..#..#...',
        '....#####....',
        '#####.#.#####',
        '....#####....',
        '...#..#..#...',
        '..#...#...#..',
        '......#......',
      ],
      // Var 2: Rose bud
      [
        '....#####....',
        '...##.####...',
        '...#######...',
        '....#####....',
        '......#......',
        '....###......',
        '......###....',
        '......#......',
      ],
      // Var 3: Potted sprout
      [
        '....#...#....',
        '.....#.#.....',
        '......#......',
        '....#####....',
        '....#####....',
        '.....###.....',
        '.............',
        '.............',
      ],
    ],
  },
  star: {
    title: 'Star',
    defaultMotion: 'pulse',
    variants: [
      // Var 0: Classic 5-point star
      [
        '......#......',
        '......#......',
        '..#########..',
        '...#######...',
        '....#####....',
        '...##.#.##...',
        '..##.....##..',
        '.............',
      ],
      // Var 1: 4-point sparkle
      [
        '......#......',
        '......#......',
        '.....###.....',
        '#############',
        '.....###.....',
        '......#......',
        '......#......',
        '.............',
      ],
      // Var 2: Shooting star
      [
        '..........#..',
        '.........###.',
        '........#####',
        '......#####..',
        '....#####....',
        '..#####......',
        '#####........',
        '#............',
      ],
      // Var 3: Constellation
      [
        '#...........#',
        '.............',
        '......#......',
        '.....###.....',
        '......#......',
        '.............',
        '#...........#',
        '.............',
      ],
    ],
  },
  smile: {
    title: 'Smiling Face',
    defaultMotion: 'alternate',
    variants: [
      // Var 0: Winking smile
      [
        '...#######...',
        '..#########..',
        '.###########.',
        '.#..#...#..#.',
        '.#.........#.',
        '.#.#.....#.#.',
        '..#.#####.#..',
        '...#######...',
      ],
      // Var 1: Big open grin
      [
        '...#######...',
        '..#########..',
        '.#.#.....#.#.',
        '.#.........#.',
        '.#.#.###.#.#.',
        '.#.#######.#.',
        '..#########..',
        '...#######...',
      ],
      // Var 2: Sunglasses cool face
      [
        '...#######...',
        '..#########..',
        '.###########.',
        '.#######.###.',
        '.#.........#.',
        '.#..#####..#.',
        '..#########..',
        '...#######...',
      ],
      // Var 3: Blush happy face
      [
        '...#######...',
        '..#########..',
        '.#.#.....#.#.',
        '.##.......##.',
        '.#..#####..#.',
        '..#########..',
        '...#######...',
        '.............',
      ],
    ],
  },
  rocket: {
    title: 'Rocket',
    defaultMotion: 'rise',
    variants: [
      // Var 0: Flaming rocket
      [
        '......#......',
        '.....###.....',
        '.....###.....',
        '....#####....',
        '....#####....',
        '...#######...',
        '..##.###.##..',
        '.....###.....',
      ],
      // Var 1: Spaceship
      [
        '......#......',
        '.....###.....',
        '....#####....',
        '...#######...',
        '..#########..',
        '.###########.',
        '..##.###.##..',
        '....#...#....',
      ],
      // Var 2: Flying saucer
      [
        '.....###.....',
        '....#####....',
        '..#########..',
        '#############',
        '..#########..',
        '....#...#....',
        '.............',
        '.............',
      ],
      // Var 3: Diagonal rocket
      [
        '..........##.',
        '........####.',
        '......######.',
        '....######...',
        '..######.....',
        '.####.##.....',
        '##...........',
        '.............',
      ],
    ],
  },
  computer: {
    title: 'Computer',
    defaultMotion: 'blink',
    variants: [
      // Var 0: Terminal with cursor
      [
        '#############',
        '#...........#',
        '#..#........#',
        '#..##.#.....#',
        '#...........#',
        '#############',
        '.....###.....',
        '....#####....',
      ],
      // Var 1: Laptop
      [
        '.............',
        '..#########..',
        '..#.......#..',
        '..#.......#..',
        '..#########..',
        '.###########.',
        '.............',
        '.............',
      ],
      // Var 2: Floppy disk
      [
        '..#########..',
        '..#..###..#..',
        '..#..###..#..',
        '..#########..',
        '..#.......#..',
        '..#.#####.#..',
        '..#########..',
        '.............',
      ],
      // Var 3: Microchip
      [
        '#.#.#.#.#.#.#',
        '.###########.',
        '#.#.......#.#',
        '.#.##.#.##.#.',
        '#.#.#####.#.#',
        '.#.##.#.##.#.',
        '#.#.......#.#',
        '.###########.',
      ],
    ],
  },
  yarn: {
    title: 'Yarn Ball',
    defaultMotion: 'bounce',
    variants: [
      // Var 0: Ball with needles
      [
        '.#.........#.',
        '..#..###..#..',
        '..#########..',
        '.###.###.###.',
        '.###########.',
        '.###.###.###.',
        '..#########..',
        '....#####.###',
      ],
      // Var 1: Round wool ball
      [
        '....#####....',
        '..#########..',
        '.###.###.###.',
        '.###########.',
        '.###.###.###.',
        '..#########..',
        '....#####....',
        '.........####',
      ],
      // Var 2: Ball with trailing thread
      [
        '....#####....',
        '..#########..',
        '.###########.',
        '.###########.',
        '..#########..',
        '....#####....',
        '..#.#.#.#.#..',
        '.............',
      ],
      // Var 3: Knitted stitch swatch
      [
        '#.#.#.#.#.#.#',
        '.#.#.#.#.#.#.',
        '#.#.#.#.#.#.#',
        '.#.#.#.#.#.#.',
        '#.#.#.#.#.#.#',
        '.#.#.#.#.#.#.',
        '#.#.#.#.#.#.#',
        '.............',
      ],
    ],
  },
  sewing: {
    title: 'Sewing Needle',
    defaultMotion: 'alternate',
    variants: [
      // Var 0: Diagonal needle with thread
      [
        '..........#..',
        '.........##..',
        '........##...',
        '.......##....',
        '......##.....',
        '.....##......',
        '....##.......',
        '...#.........',
      ],
      // Var 1: Four-hole button
      [
        '...#######...',
        '..#########..',
        '.###########.',
        '.#..#...#..#.',
        '.#..#...#..#.',
        '.###########.',
        '..#########..',
        '...#######...',
      ],
      // Var 2: Scissors
      [
        '..##.....##..',
        '.#..#...#..#.',
        '..##.....##..',
        '....#...#....',
        '.....#.#.....',
        '......#......',
        '.....#.#.....',
        '....#...#....',
      ],
      // Var 3: Running stitch seam
      [
        '.............',
        '##..##..##..#',
        '.............',
        '.............',
        '.............',
        '.............',
        '#..##..##..##',
        '.............',
      ],
    ],
  },
  camera: {
    title: 'Camera',
    defaultMotion: 'blink',
    variants: [
      // Var 0: Classic camera with flash
      [
        '....####.....',
        '.###########.',
        '.#....#....#.',
        '.#...###...#.',
        '.#....#....#.',
        '.###########.',
        '.............',
        '.............',
      ],
      // Var 1: Modern rangefinder
      [
        '..###.####...',
        '.###########.',
        '.#...###...#.',
        '.#..#####..#.',
        '.#...###...#.',
        '.###########.',
        '.............',
        '.............',
      ],
      // Var 2: Instant polaroid
      [
        '...#######...',
        '...#######...',
        '...#######...',
        '...#..#..#...',
        '...#..#..#...',
        '...#######...',
        '...#######...',
        '.............',
      ],
      // Var 3: Video cinema camera
      [
        '..##...##....',
        '.####.####.#.',
        '############.',
        '.#...###...#.',
        '.#...###...#.',
        '############.',
        '.............',
        '.............',
      ],
    ],
  },
  music: {
    title: 'Music Notes',
    defaultMotion: 'drift-left',
    variants: [
      // Var 0: Up/down staggered single and beamed eighth notes with solid stems
      [
        '.......#####.',
        '.......#...#.',
        '..##...#...#.',
        '..#.#..#...#.',
        '..#...##..##.',
        '.##...##..##.',
        '.##..........',
        '.............',
      ],
      // Var 1: High beamed eighth note pair with solid vertical stems
      [
        '..#####......',
        '..#...#......',
        '..#...#......',
        '..#...#......',
        '.##..##......',
        '.##..##......',
        '.............',
        '.............',
      ],
      // Var 2: Dancing eighth note pair at alternating pitch levels
      [
        '.......##....',
        '.......#.#...',
        '..##...#.....',
        '..#.#..#.....',
        '..#...##.....',
        '.##...##.....',
        '.##..........',
        '.............',
      ],
      // Var 3: Treble clef glyph
      [
        '......#......',
        '.....#.#.....',
        '......#......',
        '....#####....',
        '...#..#..#...',
        '....###......',
        '......#......',
        '.....##......',
      ],
    ],
  },
  sun: {
    title: 'Sun',
    defaultMotion: 'pulse',
    variants: [
      // Var 0: Symmetric 5×5 sun (3×3 core, 3 on each side, corners missing) with rays past 1px blank boundary
      [
        '...#.....#...',
        '.....###.....',
        '....#####....',
        '..#..#####..#',
        '....#####....',
        '.....###.....',
        '..#.......#..',
        '......#......',
      ],
      // Var 1: Big circular sun
      [
        '.............',
        '....#####....',
        '...#######...',
        '...#######...',
        '...#######...',
        '....#####....',
        '.............',
        '.............',
      ],
      // Var 2: Corner rising sun
      [
        '##...........',
        '####.........',
        '######.......',
        '#######......',
        '#####........',
        '###..........',
        '#............',
        '.............',
      ],
      // Var 3: Smiling sun
      [
        '....#####....',
        '...#######...',
        '..#.#...#.#..',
        '..#########..',
        '..#.#...#.#..',
        '..#.#####.#..',
        '...#######...',
        '....#####....',
      ],
    ],
  },
  moon: {
    title: 'Moon',
    defaultMotion: 'blink',
    variants: [
      // Var 0: Crescent moon with diagonal stars
      [
        '....####.....',
        '..######...#.',
        '.#####.......',
        '.####........',
        '.####........',
        '.#####.....#.',
        '..######.....',
        '....####.....',
      ],
      // Var 1: Clean crescent
      [
        '.....###.....',
        '...######....',
        '..#####......',
        '..####.......',
        '..####.......',
        '..#####......',
        '...######....',
        '.....###.....',
      ],
      // Var 2: Full moon with craters
      [
        '....#####....',
        '...#######...',
        '..##.#####..',
        '..########..',
        '..####.###..',
        '...#######...',
        '....#####....',
        '.............',
      ],
      // Var 3: Moon and cloud
      [
        '....####.....',
        '..######.....',
        '.#####.......',
        '.####........',
        '....######...',
        '..##########.',
        '.############',
        '.............',
      ],
    ],
  },
  frog: {
    title: 'Frog',
    defaultMotion: 'bounce',
    variants: [
      // Var 0: Chibi frog with round eyes
      [
        '.##.......##.',
        '####.###.####',
        '#############',
        '#############',
        '.###########.',
        '..#.......#..',
        '..#########..',
        '.##.......##.',
      ],
      // Var 1: Happy smiling frog
      [
        '.##.......##.',
        '#.#.......#.#',
        '#############',
        '#...........#',
        '#.#########.#',
        '..#########..',
        '.##.......##.',
        '.............',
      ],
      // Var 2: Jumping frog
      [
        '#...........#',
        '.##.......##.',
        '..#########..',
        '..#.#...#.#..',
        '..#########..',
        '...#######...',
        '.##.......##.',
        '#...........#',
      ],
      // Var 3: Lilypad frog
      [
        '.##.......##.',
        '####.###.####',
        '#############',
        '..#########..',
        '#############',
        '############.',
        '.###########.',
        '.............',
      ],
    ],
  },
  invader: {
    title: 'Space Invader',
    defaultMotion: 'bounce',
    variants: [
      // Var 0: Classic 8-bit invader
      [
        '..#.......#..',
        '...#.....#...',
        '..#########..',
        '.###.###.###.',
        '#############',
        '#.#.#####.#.#',
        '#...#...#...#',
        '....##.##....',
      ],
      // Var 1: Crab invader
      [
        '....#####....',
        '..#########..',
        '.###########.',
        '.##..###..##.',
        '.###########.',
        '..##.###.##..',
        '.#.........#.',
        '..#.......#..',
      ],
      // Var 2: Arcade ghost
      [
        '....#####....',
        '..#########..',
        '.###########.',
        '.#.#...#.#.#.',
        '.###########.',
        '.###########.',
        '.#.#.#.#.#.#.',
        '.#...#...#...',
      ],
      // Var 3: Flying saucer
      [
        '.....###.....',
        '...#######...',
        '.###########.',
        '#############',
        '..#..#.#..#..',
        '.............',
        '.............',
        '.............',
      ],
    ],
  },
};

// ---------------------------------------------------------------------------
// 🔍 FAST-PATH DETECTOR (Immediate detection without model inference)
// ---------------------------------------------------------------------------
const KEYWORD_MAP: Record<string, { subject: string; motion?: SemanticMotion }> = {
  // Direct literal subjects
  heart: { subject: 'heart', motion: 'pulse' },
  'blinking heart': { subject: 'heart', motion: 'blink' },
  'beating heart': { subject: 'heart', motion: 'pulse' },
  coffee: { subject: 'coffee', motion: 'rise' },
  'steaming coffee': { subject: 'coffee', motion: 'rise' },
  mug: { subject: 'coffee', motion: 'rise' },
  tea: { subject: 'coffee', motion: 'rise' },
  cat: { subject: 'cat', motion: 'blink' },
  kitten: { subject: 'cat', motion: 'blink' },
  'waving cat': { subject: 'cat', motion: 'bounce' },
  dog: { subject: 'dog', motion: 'bounce' },
  puppy: { subject: 'dog', motion: 'bounce' },
  fish: { subject: 'fish', motion: 'wave' },
  'swimming fish': { subject: 'fish', motion: 'wave' },
  butterfly: { subject: 'butterfly', motion: 'pulse' },
  duck: { subject: 'duck', motion: 'bounce' },
  flower: { subject: 'flower', motion: 'pulse' },
  flowers: { subject: 'flower', motion: 'pulse' },
  star: { subject: 'star', motion: 'pulse' },
  'twinkling star': { subject: 'star', motion: 'blink' },
  sparkle: { subject: 'star', motion: 'blink' },
  smile: { subject: 'smile', motion: 'alternate' },
  happy: { subject: 'smile', motion: 'alternate' },
  rocket: { subject: 'rocket', motion: 'rise' },
  computer: { subject: 'computer', motion: 'blink' },
  laptop: { subject: 'computer', motion: 'blink' },
  terminal: { subject: 'computer', motion: 'blink' },
  yarn: { subject: 'yarn', motion: 'bounce' },
  knit: { subject: 'yarn', motion: 'bounce' },
  sewing: { subject: 'sewing', motion: 'alternate' },
  needle: { subject: 'sewing', motion: 'alternate' },
  camera: { subject: 'camera', motion: 'blink' },
  photo: { subject: 'camera', motion: 'blink' },
  music: { subject: 'music', motion: 'drift-left' },
  note: { subject: 'music', motion: 'drift-left' },
  melody: { subject: 'music', motion: 'drift-left' },
  sun: { subject: 'sun', motion: 'pulse' },
  moon: { subject: 'moon', motion: 'blink' },
  crescent: { subject: 'moon', motion: 'blink' },
  frog: { subject: 'frog', motion: 'bounce' },
  invader: { subject: 'invader', motion: 'bounce' },
  alien: { subject: 'invader', motion: 'bounce' },
  dot: { subject: 'dot', motion: 'blink' },
  'blinking dot': { subject: 'dot', motion: 'blink' },
  circle: { subject: 'dot', motion: 'pulse' },
};

/**
 * Checks if the prompt directly and unambiguously maps to a supported visual pattern
 */
export function detectFastPath(
  prompt: string,
  frameCount: number
): { isFastPath: boolean; plan: SemanticAnimationPlan } | null {
  const p = (prompt || '').toLowerCase().trim();
  if (!p) return null;

  // Exact or direct phrase match
  for (const [kw, mapping] of Object.entries(KEYWORD_MAP)) {
    // If prompt starts with, ends with, or matches the keyword
    const regex = new RegExp(`\\b${kw}\\b`, 'i');
    if (regex.test(p)) {
      // Determine motion: if prompt mentions 'blink', 'pulse', 'bounce', 'wave', etc., honor it
      let motion = mapping.motion || 'static';
      if (p.includes('blink')) motion = 'blink';
      else if (p.includes('pulse') || p.includes('beat')) motion = 'pulse';
      else if (p.includes('bounce') || p.includes('jump')) motion = 'bounce';
      else if (p.includes('wave') || p.includes('swim')) motion = 'wave';
      else if (p.includes('rise') || p.includes('steam')) motion = 'rise';
      else if (p.includes('drift') || p.includes('scroll')) {
        motion = p.includes('right') ? 'drift-right' : 'drift-left';
      } else if (frameCount === 1) {
        motion = 'static';
      }

      const variant = hashString(p) % 4;
      const speed: SemanticSpeed = p.includes('fast') ? 'fast' : p.includes('slow') ? 'slow' : 'medium';

      return {
        isFastPath: true,
        plan: {
          subject: mapping.subject,
          motion,
          speed,
          variant,
        },
      };
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// 🧩 ABSTRACT PROCEDURAL RENDERER (For subjects not in catalog)
// ---------------------------------------------------------------------------
function generateAbstractSprite(prompt: string, variant: number): number[][] {
  const h = hashString(prompt + '-' + variant);
  const grid = createEmptyGrid();

  for (let r = 0; r < MATRIX_ROWS; r++) {
    for (let c = 0; c < 7; c++) {
      const bitIndex = (r * 7 + c + (h % 29)) % 32;
      const isBitSet = ((h >> (bitIndex % 16)) & 1) === 1;
      const centerDist = Math.abs(r - 3.5) + Math.abs(c - 6);
      const isLit = (centerDist >= 1.5 && centerDist <= 5.5 && (isBitSet || (r + c + variant) % 2 === 0));
      grid[r][c] = isLit ? 1 : 0;
      grid[r][MATRIX_COLS - 1 - c] = isLit ? 1 : 0; // Horizontal mirror
    }
  }

  // Ensure center has some lit pixels
  grid[3][6] = 1;
  grid[4][6] = 1;
  return grid;
}

// ---------------------------------------------------------------------------
// 🎬 DETERMINISTIC EXPANDER (Expands base sprite across frameCount)
// ---------------------------------------------------------------------------
export function renderSemanticPlan(
  plan: SemanticAnimationPlan,
  frameCount: number,
  originalPrompt: string = ''
): {
  title: string;
  description: string;
  frames: number[][][];
  frameDelayMs: number;
  isAbstract: boolean;
} {
  const normSubject = (plan.subject || 'glyph').toLowerCase().trim();
  const def = SPRITE_CATALOG[normSubject];
  const isAbstract = !def;

  const title = def ? def.title : (originalPrompt ? originalPrompt.slice(0, 24).trim() : 'Abstract Glyph');
  const description = def
    ? `${def.title} with ${plan.motion} motion`
    : `Interpreted abstract pattern for "${originalPrompt || normSubject}"`;

  const variantIndex = Math.min(Math.max(0, plan.variant ?? 0), 3);
  const baseGrid: number[][] = def
    ? rowsToGrid(def.variants[variantIndex] || def.variants[0])
    : generateAbstractSprite(originalPrompt || normSubject, variantIndex);

  // Speed to ms
  let frameDelayMs = 220;
  if (plan.speed === 'fast') frameDelayMs = 120;
  else if (plan.speed === 'slow') frameDelayMs = 360;

  const validFrameCount = Math.max(1, Math.min(16, frameCount || 1));
  const frames: number[][][] = [];

  for (let f = 0; f < validFrameCount; f++) {
    const frame = createEmptyGrid();
    const normTime = validFrameCount > 1 ? f / validFrameCount : 0;

    switch (plan.motion) {
      case 'static': {
        for (let r = 0; r < MATRIX_ROWS; r++) {
          for (let c = 0; c < MATRIX_COLS; c++) {
            frame[r][c] = baseGrid[r][c];
          }
        }
        break;
      }

      case 'blink': {
        const isVisible = validFrameCount <= 1 || (f % 2 === 0);
        if (isVisible) {
          for (let r = 0; r < MATRIX_ROWS; r++) {
            for (let c = 0; c < MATRIX_COLS; c++) {
              frame[r][c] = baseGrid[r][c];
            }
          }
        }
        break;
      }

      case 'pulse': {
        const isPulse = validFrameCount > 1 && (f % 2 === 1);
        for (let r = 0; r < MATRIX_ROWS; r++) {
          for (let c = 0; c < MATRIX_COLS; c++) {
            if (baseGrid[r][c] === 1) {
              frame[r][c] = 1;
              if (isPulse) {
                // Add soft boundary dilation
                if (r - 1 >= 0) frame[r - 1][c] = 1;
                if (r + 1 < MATRIX_ROWS) frame[r + 1][c] = 1;
                if (c - 1 >= 0) frame[r][c - 1] = 1;
                if (c + 1 < MATRIX_COLS) frame[r][c + 1] = 1;
              }
            }
          }
        }
        break;
      }

      case 'bounce': {
        const offsetY = validFrameCount > 1 ? Math.round(1.5 * Math.sin(2 * Math.PI * normTime)) : 0;
        for (let r = 0; r < MATRIX_ROWS; r++) {
          for (let c = 0; c < MATRIX_COLS; c++) {
            if (baseGrid[r][c] === 1) {
              const targetR = r + offsetY;
              if (targetR >= 0 && targetR < MATRIX_ROWS) {
                frame[targetR][c] = 1;
              }
            }
          }
        }
        break;
      }

      case 'drift-left': {
        const shiftX = Math.round(normTime * MATRIX_COLS);
        for (let r = 0; r < MATRIX_ROWS; r++) {
          for (let c = 0; c < MATRIX_COLS; c++) {
            if (baseGrid[r][c] === 1) {
              const targetC = ((c - shiftX) % MATRIX_COLS + MATRIX_COLS) % MATRIX_COLS;
              frame[r][targetC] = 1;
            }
          }
        }
        break;
      }

      case 'drift-right': {
        const shiftX = Math.round(normTime * MATRIX_COLS);
        for (let r = 0; r < MATRIX_ROWS; r++) {
          for (let c = 0; c < MATRIX_COLS; c++) {
            if (baseGrid[r][c] === 1) {
              const targetC = (c + shiftX) % MATRIX_COLS;
              frame[r][targetC] = 1;
            }
          }
        }
        break;
      }

      case 'rise': {
        const offsetY = -Math.round(normTime * 3);
        const isLate = normTime > 0.7;
        for (let r = 0; r < MATRIX_ROWS; r++) {
          for (let c = 0; c < MATRIX_COLS; c++) {
            if (baseGrid[r][c] === 1) {
              const targetR = r + offsetY;
              if (targetR >= 0 && targetR < MATRIX_ROWS) {
                if (isLate && targetR < 2 && (r + c) % 2 === 0) continue; // Dissolve top
                frame[targetR][c] = 1;
              }
            }
          }
        }
        break;
      }

      case 'wave': {
        for (let c = 0; c < MATRIX_COLS; c++) {
          const offsetY = Math.round(Math.sin(2 * Math.PI * (normTime + c / 6)));
          for (let r = 0; r < MATRIX_ROWS; r++) {
            if (baseGrid[r][c] === 1) {
              const targetR = r + offsetY;
              if (targetR >= 0 && targetR < MATRIX_ROWS) {
                frame[targetR][c] = 1;
              }
            }
          }
        }
        break;
      }

      case 'alternate': {
        const isAlt = validFrameCount > 1 && (f % 2 === 1);
        const shiftX = isAlt ? 1 : 0;
        for (let r = 0; r < MATRIX_ROWS; r++) {
          for (let c = 0; c < MATRIX_COLS; c++) {
            if (baseGrid[r][c] === 1) {
              const targetC = c + shiftX;
              if (targetC >= 0 && targetC < MATRIX_COLS) {
                frame[r][targetC] = 1;
              }
            }
          }
        }
        break;
      }

      default: {
        for (let r = 0; r < MATRIX_ROWS; r++) {
          for (let c = 0; c < MATRIX_COLS; c++) {
            frame[r][c] = baseGrid[r][c];
          }
        }
      }
    }

    frames.push(frame);
  }

  return {
    title,
    description,
    frames,
    frameDelayMs,
    isAbstract,
  };
}
