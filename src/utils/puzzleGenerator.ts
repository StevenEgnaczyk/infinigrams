export const generateValidPuzzle = (
  size: { rows: number; columns: number },
  fillProbability: number,
  rng: () => number
): boolean[][] => {
  const maxAttempts = 100;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const grid = Array.from({ length: size.rows }, () =>
      Array.from({ length: size.columns }, () => rng() < fillProbability)
    );

    if (isValidPuzzle(grid)) {
      return grid;
    }
  }

  // Fallback: ensure every row/column has at least one filled cell.
  const grid = Array.from({ length: size.rows }, () =>
    Array.from({ length: size.columns }, () => rng() < Math.max(fillProbability, 0.45))
  );

  for (let r = 0; r < size.rows; r++) {
    if (grid[r].every((cell) => !cell)) {
      grid[r][Math.floor(rng() * size.columns)] = true;
    }
  }

  for (let c = 0; c < size.columns; c++) {
    if (grid.every((row) => !row[c])) {
      grid[Math.floor(rng() * size.rows)][c] = true;
    }
  }

  return grid;
};

export const isValidPuzzle = (solution: boolean[][]): boolean => {
  const rows = solution.length;
  const cols = solution[0]?.length ?? 0;
  if (rows === 0 || cols === 0) return false;

  const hasEmptyLine =
    solution.some((row) => row.every((cell) => !cell)) ||
    Array.from({ length: cols }, (_, col) => solution.every((row) => !row[col])).some(Boolean);

  if (hasEmptyLine) return false;

  // Reject isolated filled cells (no orthogonal neighbor).
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      if (!solution[i][j]) continue;

      const hasAdjacent =
        (i > 0 && solution[i - 1][j]) ||
        (i < rows - 1 && solution[i + 1][j]) ||
        (j > 0 && solution[i][j - 1]) ||
        (j < cols - 1 && solution[i][j + 1]);

      if (!hasAdjacent) return false;
    }
  }

  return true;
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
      count++;
      continue;
    }

    if (count > 0) {
      hints.push(count);
      count = 0;
    }
  }

  if (count > 0) {
    hints.push(count);
  }

  return hints.length ? hints : [0];
};
