import { PixelScenePlan, PixelSceneLayer } from '../types/pixelScene';
import { MATRIX_COLS, MATRIX_ROWS } from './pixelSceneExpander';

/**
 * Stable 32-bit hash of a string (DJB2)
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
 * Procedural fallback catalog for recognizable themes
 */
interface PatternTemplate {
  keywords: string[];
  title: string;
  frameMs: number;
  layers: PixelSceneLayer[];
}

const FALLBACK_TEMPLATES: PatternTemplate[] = [
  {
    keywords: ['coffee', 'cup', 'tea', 'mug', 'pour-over', 'drink', 'latte', 'brew'],
    title: 'Pour-Over Coffee',
    frameMs: 140,
    layers: [
      {
        name: 'mug',
        rows: [
          '.............',
          '.............',
          '.............',
          '..########...',
          '..#......#.#.',
          '..#......##..',
          '..#......#...',
          '...######....',
        ],
        animation: { type: 'static' },
      },
      {
        name: 'steam',
        rows: [
          '....#...#....',
          '...#.....#...',
          '....#...#....',
          '.............',
          '.............',
          '.............',
          '.............',
          '.............',
        ],
        animation: { type: 'rise-and-fade', distance: 3, loop: true },
      },
    ],
  },
  {
    keywords: ['cat', 'kitten', 'kitty', 'paw', 'feline', 'meow'],
    title: 'Waving Cat',
    frameMs: 220,
    layers: [
      {
        name: 'cat_face',
        rows: [
          '..#.......#..',
          '.###.....###.',
          '.###########.',
          '.#.#.....#.#.',
          '.###########.',
          '..###.#.###..',
          '...#######...',
          '....#####....',
        ],
        animation: { type: 'static' },
      },
      {
        name: 'paw',
        rows: [
          '.............',
          '.............',
          '.............',
          '...........#.',
          '..........##.',
          '.........###.',
          '.............',
          '.............',
        ],
        animation: { type: 'bounce-y', distance: 2 },
      },
    ],
  },
  {
    keywords: ['dog', 'puppy', 'bark', 'hound', 'canine'],
    title: 'Puppy Friend',
    frameMs: 240,
    layers: [
      {
        name: 'dog_head',
        rows: [
          '.##.......##.',
          '.###.###.###.',
          '..#########..',
          '..#.#...#.#..',
          '..#########..',
          '...###.###...',
          '....#####....',
          '.....###.....',
        ],
        animation: { type: 'static' },
      },
      {
        name: 'tail',
        rows: [
          '.............',
          '...........#.',
          '..........##.',
          '.........##..',
          '.............',
          '.............',
          '.............',
          '.............',
        ],
        animation: { type: 'bounce-x', distance: 2 },
      },
    ],
  },
  {
    keywords: ['fish', 'swim', 'ocean', 'sea', 'aquarium', 'water'],
    title: 'Swimming Fish',
    frameMs: 160,
    layers: [
      {
        name: 'fish',
        rows: [
          '.....####....',
          '..########...',
          '.##.#.#####.#',
          '#############',
          '#############',
          '.##########.#',
          '..########...',
          '.....####....',
        ],
        animation: { type: 'wave', distance: 1 },
      },
    ],
  },
  {
    keywords: ['butterfly', 'flutter', 'bug', 'insect', 'wings'],
    title: 'Fluttering Butterfly',
    frameMs: 200,
    layers: [
      {
        name: 'body',
        rows: [
          '.....#.#.....',
          '......#......',
          '......#......',
          '......#......',
          '......#......',
          '......#......',
          '......#......',
          '.............',
        ],
        animation: { type: 'static' },
      },
      {
        name: 'wings',
        rows: [
          '..##.....##..',
          '.####...####.',
          '######.######',
          '.####...####.',
          '..##.....##..',
          '.###.....###.',
          '..#.......#..',
          '.............',
        ],
        animation: { type: 'pulse', distance: 1 },
      },
    ],
  },
  {
    keywords: ['duck', 'bird', 'quack', 'rubber duck'],
    title: 'Hacker Duck',
    frameMs: 220,
    layers: [
      {
        name: 'duck',
        rows: [
          '....####.....',
          '...######....',
          '.######.#....',
          '..#######....',
          '...########..',
          '..##########.',
          '..##########.',
          '...########..',
        ],
        animation: { type: 'bounce-y', distance: 1 },
      },
    ],
  },
  {
    keywords: ['flower', 'flowers', 'blossom', 'rose', 'daisy', 'plant', 'tulip', 'bloom'],
    title: 'Blooming Flower',
    frameMs: 250,
    layers: [
      {
        name: 'stem',
        rows: [
          '.............',
          '.............',
          '.............',
          '......#......',
          '....###......',
          '......#......',
          '......###....',
          '......#......',
        ],
        animation: { type: 'static' },
      },
      {
        name: 'petals',
        rows: [
          '....#####....',
          '...#######...',
          '..###.#.###..',
          '...#######...',
          '....#####....',
          '.............',
          '.............',
          '.............',
        ],
        animation: { type: 'pulse', distance: 1 },
      },
    ],
  },
  {
    keywords: ['heart', 'love', 'valentine', 'like', 'beating'],
    title: 'Beating Heart',
    frameMs: 200,
    layers: [
      {
        name: 'heart',
        rows: [
          '..###...###..',
          '.#####.#####.',
          '#############',
          '#############',
          '.###########.',
          '..#########..',
          '...#######...',
          '.....###.....',
        ],
        animation: { type: 'pulse', distance: 1 },
      },
    ],
  },
  {
    keywords: ['star', 'twinkle', 'sparkle', 'shining', 'space'],
    title: 'Twinkling Star',
    frameMs: 180,
    layers: [
      {
        name: 'star',
        rows: [
          '......#......',
          '......#......',
          '..#########..',
          '...#######...',
          '....#####....',
          '...##.#.##...',
          '..##.....##..',
          '.............',
        ],
        animation: { type: 'static' },
      },
      {
        name: 'sparkles',
        rows: [
          '#...........#',
          '.............',
          '.............',
          '.............',
          '.............',
          '.............',
          '.............',
          '#...........#',
        ],
        animation: { type: 'blink' },
      },
    ],
  },
  {
    keywords: ['smile', 'happy', 'face', 'grin', 'wink', 'emoji'],
    title: 'Smiling Friend',
    frameMs: 280,
    layers: [
      {
        name: 'face_contour',
        rows: [
          '...#######...',
          '..#########..',
          '.###########.',
          '.#.........#.',
          '.#..#...#..#.',
          '.###########.',
          '..#########..',
          '...#######...',
        ],
        animation: { type: 'static' },
      },
      {
        name: 'eyes_smile',
        rows: [
          '.............',
          '.............',
          '....#...#....',
          '....#...#....',
          '.............',
          '...#.....#...',
          '....#####....',
          '.............',
        ],
        animation: { type: 'alternate' },
      },
    ],
  },
  {
    keywords: ['rocket', 'space', 'blast', 'launch', 'shuttle', 'ship'],
    title: 'Rocket Launch',
    frameMs: 180,
    layers: [
      {
        name: 'hull',
        rows: [
          '......#......',
          '.....###.....',
          '.....###.....',
          '....#####....',
          '....#####....',
          '...#######...',
          '..##.###.##..',
          '..#.......#..',
        ],
        animation: { type: 'static' },
      },
      {
        name: 'flame',
        rows: [
          '.............',
          '.............',
          '.............',
          '.............',
          '.............',
          '.............',
          '.....###.....',
          '......#......',
        ],
        animation: { type: 'pulse', distance: 1 },
      },
    ],
  },
  {
    keywords: ['computer', 'laptop', 'pc', 'screen', 'terminal', 'code', 'hacker'],
    title: 'Retro Terminal',
    frameMs: 240,
    layers: [
      {
        name: 'monitor',
        rows: [
          '#############',
          '#...........#',
          '#...........#',
          '#...........#',
          '#...........#',
          '#############',
          '.....###.....',
          '....#####....',
        ],
        animation: { type: 'static' },
      },
      {
        name: 'prompt_cursor',
        rows: [
          '.............',
          '..#..........',
          '..##.#.......',
          '..#..........',
          '.............',
          '.............',
          '.............',
          '.............',
        ],
        animation: { type: 'blink' },
      },
    ],
  },
  {
    keywords: ['yarn', 'knit', 'knitting', 'wool', 'crochet', 'craft'],
    title: 'Knitting Yarn',
    frameMs: 220,
    layers: [
      {
        name: 'ball',
        rows: [
          '....#####....',
          '..#########..',
          '.###.###.###.',
          '.###########.',
          '.###.###.###.',
          '..#########..',
          '....#####....',
          '.............',
        ],
        animation: { type: 'bounce-x', distance: 1 },
      },
      {
        name: 'thread',
        rows: [
          '.............',
          '.............',
          '.............',
          '.............',
          '.............',
          '.............',
          '.........####',
          '............#',
        ],
        animation: { type: 'pulse' },
      },
    ],
  },
  {
    keywords: ['sewing', 'stitch', 'needle', 'thread', 'sew'],
    title: 'Stitching Needle',
    frameMs: 200,
    layers: [
      {
        name: 'needle',
        rows: [
          '..........#..',
          '.........##..',
          '........##...',
          '.......##....',
          '......##.....',
          '.....##......',
          '....##.......',
          '...#.........',
        ],
        animation: { type: 'static' },
      },
      {
        name: 'thread_stitches',
        rows: [
          '.............',
          '#.#.#.#.#....',
          '.............',
          '.............',
          '.............',
          '.............',
          '.............',
          '#.#.#.#.#....',
        ],
        animation: { type: 'alternate' },
      },
    ],
  },
  {
    keywords: ['camera', 'photo', 'snap', 'lens', 'shutter', 'picture'],
    title: 'Classic Camera',
    frameMs: 250,
    layers: [
      {
        name: 'body',
        rows: [
          '....####.....',
          '.###########.',
          '.#....#....#.',
          '.#...###...#.',
          '.#....#....#.',
          '.###########.',
          '.............',
          '.............',
        ],
        animation: { type: 'static' },
      },
      {
        name: 'flash',
        rows: [
          '..##.........',
          '.............',
          '.............',
          '.............',
          '.............',
          '.............',
          '.............',
          '.............',
        ],
        animation: { type: 'blink' },
      },
    ],
  },
  {
    keywords: ['music', 'note', 'melody', 'song', 'tune', 'sound', 'audio'],
    title: 'Musical Notes',
    frameMs: 180,
    layers: [
      {
        name: 'melody',
        rows: [
          '.......#####.',
          '.......#...#.',
          '..##...#...#.',
          '..#.#..#...#.',
          '..#...##..##.',
          '.##...##..##.',
          '.##..........',
          '.............',
        ],
        animation: { type: 'drift-x', direction: 'left', distance: 13, loop: true },
      },
    ],
  },
  {
    keywords: ['sun', 'sunny', 'solar', 'daylight', 'bright'],
    title: 'Radiant Sun',
    frameMs: 220,
    layers: [
      {
        name: 'sun_disc',
        rows: [
          '.............',
          '.....###.....',
          '....#####....',
          '....#####....',
          '....#####....',
          '.....###.....',
          '.............',
          '.............',
        ],
        animation: { type: 'static' },
      },
      {
        name: 'rays',
        rows: [
          '...#.....#...',
          '.............',
          '.............',
          '..#.......#..',
          '.............',
          '.............',
          '..#.......#..',
          '......#......',
        ],
        animation: { type: 'pulse', distance: 1 },
      },
    ],
  },
  {
    keywords: ['moon', 'crescent', 'night', 'lunar'],
    title: 'Crescent Moon',
    frameMs: 260,
    layers: [
      {
        name: 'crescent',
        rows: [
          '....####.....',
          '..######.....',
          '.#####.......',
          '.####........',
          '.####........',
          '.#####.......',
          '..######.....',
          '....####.....',
        ],
        animation: { type: 'static' },
      },
      {
        name: 'stars',
        rows: [
          '..........#..',
          '.............',
          '.......#.....',
          '.............',
          '...........#.',
          '.............',
          '........#....',
          '.............',
        ],
        animation: { type: 'blink' },
      },
    ],
  },
  {
    keywords: ['frog', 'toad', 'amphibian'],
    title: 'Chibi Frog',
    frameMs: 320,
    layers: [
      {
        name: 'frog_body',
        rows: [
          '.##.......##.',
          '####.###.####',
          '#############',
          '#############',
          '.###########.',
          '..#.......#..',
          '..#########..',
          '.##.......##.',
        ],
        animation: { type: 'static' },
      },
      {
        name: 'eyes_blink',
        rows: [
          '.#.........#.',
          '.#.........#.',
          '.............',
          '.............',
          '.............',
          '.............',
          '.............',
          '.............',
        ],
        animation: { type: 'blink' },
      },
    ],
  },
  {
    keywords: ['invader', 'alien', 'arcade', 'retro'],
    title: 'Space Invader',
    frameMs: 260,
    layers: [
      {
        name: 'invader',
        rows: [
          '..#.......#..',
          '...#.....#...',
          '..#########..',
          '.###.###.###.',
          '#############',
          '#.#.#####.#.#',
          '#...#...#...#',
          '....##.##....',
        ],
        animation: { type: 'bounce-x', distance: 1 },
      },
    ],
  },
];

/**
 * Procedural abstract fallback when no keywords match
 * Generates an aesthetic symmetric geometric glyph using a deterministic string hash
 */
export function generateAbstractFallbackPlan(
  prompt: string,
  frameCount: number
): PixelScenePlan {
  const h = hashString(prompt || 'uno-q');
  const animStyles: ('pulse' | 'wave' | 'orbit' | 'bounce-x' | 'alternate')[] = [
    'pulse',
    'wave',
    'orbit',
    'bounce-x',
    'alternate',
  ];
  const chosenAnim = animStyles[h % animStyles.length];

  // Build symmetric 8x13 grid
  const rows: string[] = [];
  for (let r = 0; r < MATRIX_ROWS; r++) {
    const halfRow: string[] = [];
    for (let c = 0; c < 7; c++) {
      // Deterministic bit based on coordinates and hash bits
      const bitIndex = (r * 7 + c + (h % 31)) % 32;
      const isBitSet = ((h >> (bitIndex % 16)) & 1) === 1;
      const centerDist = Math.abs(r - 3.5) + Math.abs(c - 6);
      const isRing = centerDist > 1 && centerDist < 6;
      halfRow.push(isRing && (isBitSet || (r + c) % 2 === 0) ? '#' : '.');
    }
    // Mirror across column 6
    const fullRow = [
      ...halfRow,
      ...halfRow.slice(0, 6).reverse(),
    ].join('');
    rows.push(fullRow);
  }

  // Ensure center has some lit pixels
  rows[3] = rows[3].substring(0, 5) + '###' + rows[3].substring(8);
  rows[4] = rows[4].substring(0, 5) + '###' + rows[4].substring(8);

  const cleanTitle = prompt
    ? prompt.slice(0, 24).replace(/[^\w\s-]/g, '').trim() || 'Circuit Pattern'
    : 'Circuit Pattern';

  return {
    version: 1,
    title: cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1),
    frameCount,
    frameMs: 200,
    layers: [
      {
        name: 'pattern',
        rows,
        animation: {
          type: chosenAnim,
          distance: 1,
        },
      },
    ],
  };
}

/**
 * Deterministic prompt-to-animation fallback
 */
export function generateFallbackPlan(
  prompt: string,
  frameCount: number
): PixelScenePlan {
  const pLower = (prompt || '').toLowerCase().trim();

  // 1. Keyword match against rich templates
  for (const template of FALLBACK_TEMPLATES) {
    for (const kw of template.keywords) {
      if (pLower.includes(kw)) {
        return {
          version: 1,
          title: template.title,
          frameCount,
          frameMs: template.frameMs,
          layers: template.layers,
        };
      }
    }
  }

  // 2. Abstract procedural fallback
  return generateAbstractFallbackPlan(prompt, frameCount);
}
