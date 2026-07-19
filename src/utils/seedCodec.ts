export interface DecodedImageSeed {
  grid: boolean[][];
  threshold: number;
  rows: number;
  cols: number;
}

const CURRENT_VERSION = 2;

/** Pack a boolean grid into byte-aligned bit data (row-major). */
export function encodeImageSeed(
  grid: boolean[][],
  threshold: number
): string {
  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;
  const bytes: number[] = [];
  let byte = 0;
  let bit = 0;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c]) {
        byte |= 1 << bit;
      }
      bit += 1;
      if (bit === 8) {
        bytes.push(byte);
        byte = 0;
        bit = 0;
      }
    }
  }

  if (bit > 0) {
    bytes.push(byte);
  }

  const seedData = {
    v: CURRENT_VERSION,
    g: bytes,
    t: threshold,
    s: [rows, cols] as [number, number],
  };

  return `img_${btoa(JSON.stringify(seedData))}`;
}

export function decodeImageSeed(seed: string): DecodedImageSeed {
  if (!seed.startsWith('img_')) {
    throw new Error('Not an image seed');
  }

  const data = JSON.parse(atob(seed.substring(4))) as {
    v?: number;
    g: number[];
    t: number;
    s: [number, number];
  };

  const [rows, cols] = data.s;
  const threshold = data.t;

  if (data.v === CURRENT_VERSION) {
    const grid = Array.from({ length: rows }, () => Array(cols).fill(false));
    let idx = 0;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const byteIndex = Math.floor(idx / 8);
        const bit = idx % 8;
        grid[r][c] = !!((data.g[byteIndex] ?? 0) & (1 << bit));
        idx += 1;
      }
    }

    return { grid, threshold, rows, cols };
  }

  // Legacy format used overlapping 8-bit masks and cannot round-trip wide grids.
  // Best-effort decode so older narrow seeds may still open.
  const grid = data.g.map((num) =>
    Array.from({ length: cols }, (_, i) => !!(num & (1 << (i % 8))))
  );

  return { grid, threshold, rows, cols };
}
