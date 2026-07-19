import { Difficulty, GridSize } from '../types/gameTypes';

const RANDOM_SEED_PATTERN = /^(\d+)x(\d+)-(easy|medium|hard)-(.+)$/;

export interface ParsedRandomSeed {
  size: GridSize;
  difficulty: Difficulty;
  rngSeed: string;
  fullSeed: string;
}

export const createRandomSeed = (
  size: GridSize,
  difficulty: Difficulty,
  rngSeed = Math.random().toString(36).substring(2, 9)
): ParsedRandomSeed => ({
  size,
  difficulty,
  rngSeed,
  fullSeed: `${size.rows}x${size.columns}-${difficulty}-${rngSeed}`,
});

export const parseRandomSeed = (
  seed: string,
  fallbackSize: GridSize,
  fallbackDifficulty: Difficulty
): ParsedRandomSeed => {
  const match = seed.match(RANDOM_SEED_PATTERN);
  if (match) {
    return {
      size: { rows: Number(match[1]), columns: Number(match[2]) },
      difficulty: match[3] as Difficulty,
      rngSeed: match[4],
      fullSeed: seed,
    };
  }

  // Legacy seeds are only the random portion; pair with the selected size/difficulty.
  return createRandomSeed(fallbackSize, fallbackDifficulty, seed);
};

export const packGrid = (grid: boolean[][]): number[] => {
  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;
  const totalBits = rows * cols;
  const bytes = new Array(Math.ceil(totalBits / 8)).fill(0);

  for (let i = 0; i < totalBits; i++) {
    const row = Math.floor(i / cols);
    const col = i % cols;
    if (grid[row][col]) {
      bytes[Math.floor(i / 8)] |= 1 << (i % 8);
    }
  }

  return bytes;
};

export const unpackGrid = (bytes: number[], rows: number, cols: number): boolean[][] => {
  const grid: boolean[][] = Array.from({ length: rows }, () => Array(cols).fill(false));
  const totalBits = rows * cols;

  for (let i = 0; i < totalBits; i++) {
    const row = Math.floor(i / cols);
    const col = i % cols;
    grid[row][col] = !!(bytes[Math.floor(i / 8)] & (1 << (i % 8)));
  }

  return grid;
};

export const encodeImageSeed = (
  grid: boolean[][],
  threshold: number
): string => {
  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;
  const seedData = {
    v: 2,
    b: packGrid(grid),
    t: threshold,
    s: [rows, cols] as [number, number],
  };

  return `img_${btoa(JSON.stringify(seedData))}`;
};

export const decodeImageSeed = (seed: string): {
  grid: boolean[][];
  threshold: number;
  rows: number;
  cols: number;
} => {
  const encodedData = seed.substring(4);
  const parsed = JSON.parse(atob(encodedData)) as {
    v?: number;
    b?: number[];
    g?: number[];
    t: number;
    s: [number, number];
  };

  const [rows, cols] = parsed.s;

  if (parsed.v === 2 && parsed.b) {
    return {
      grid: unpackGrid(parsed.b, rows, cols),
      threshold: parsed.t,
      rows,
      cols,
    };
  }

  // Legacy broken packing (kept for old seeds that still happen to decode).
  if (parsed.g) {
    const grid = parsed.g.map((num) =>
      Array.from({ length: cols }, (_, i) => !!(num & Math.pow(2, i % 8)))
    );
    return { grid, threshold: parsed.t, rows, cols };
  }

  throw new Error('Unrecognized image seed format');
};
