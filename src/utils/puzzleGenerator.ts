export const generateValidPuzzle = (
  size: { rows: number; columns: number },
  fillProbability: number,
  rng: () => number
): boolean[][] => {
  const grid = Array(size.rows).fill(0).map(() =>
    Array(size.columns).fill(false).map(() => rng() < fillProbability)
  );
  return grid;
};

export const generateHints = (grid: boolean[][]): { rowHints: number[][]; columnHints: number[][] } => {
  const rowHints = grid.map(row => {
    const hints: number[] = [];
    let count = 0;
    row.forEach((cell, i) => {
      if (cell) count++;
      if ((!cell || i === row.length - 1) && count > 0) {
        if (cell) hints.push(count);
        else hints.push(count);
        count = 0;
      }
    });
    return hints.length ? hints : [0];
  });

  const columnHints = Array(grid[0].length).fill(0).map((_, col) => {
    const hints: number[] = [];
    let count = 0;
    for (let row = 0; row < grid.length; row++) {
      if (grid[row][col]) count++;
      if ((!grid[row][col] || row === grid.length - 1) && count > 0) {
        if (grid[row][col]) hints.push(count);
        else hints.push(count);
        count = 0;
      }
    }
    return hints.length ? hints : [0];
  });

  return { rowHints, columnHints };
}; 