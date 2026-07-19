export const generateValidPuzzle = (
  size: { rows: number; columns: number },
  fillProbability: number,
  rng: () => number
): boolean[][] => {
  const maxAttempts = 50;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const grid = Array.from({ length: size.rows }, () =>
      Array.from({ length: size.columns }, () => rng() < fillProbability)
    );

    if (hasFilledCell(grid) && !hasEmptyLine(grid)) {
      return grid;
    }
  }

  // Guaranteed non-empty fallback if RNG is unlucky.
  const fallback = Array.from({ length: size.rows }, () =>
    Array.from({ length: size.columns }, () => false)
  );
  fallback[0][0] = true;
  fallback[0][1] = true;
  fallback[1][0] = true;
  return fallback;
};

const hasFilledCell = (grid: boolean[][]): boolean =>
  grid.some((row) => row.some((cell) => cell));

const hasEmptyLine = (grid: boolean[][]): boolean => {
  const cols = grid[0]?.length ?? 0;
  return (
    grid.some((row) => row.every((cell) => !cell)) ||
    Array.from({ length: cols }, (_, col) =>
      grid.every((row) => !row[col])
    ).some(Boolean)
  );
};

export const generateHints = (
  grid: boolean[][]
): { rowHints: number[][]; columnHints: number[][] } => {
  const rowHints = grid.map((row) => lineToHints(row));

  const columnHints = Array.from({ length: grid[0].length }, (_, col) =>
    lineToHints(grid.map((row) => row[col]))
  );

  return { rowHints, columnHints };
};

const lineToHints = (line: boolean[]): number[] => {
  const hints: number[] = [];
  let count = 0;

  for (let i = 0; i < line.length; i++) {
    if (line[i]) {
      count += 1;
    } else if (count > 0) {
      hints.push(count);
      count = 0;
    }
  }

  if (count > 0) {
    hints.push(count);
  }

  return hints.length ? hints : [0];
};
