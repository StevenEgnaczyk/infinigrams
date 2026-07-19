export const generateValidPuzzle = (
  size: { rows: number; columns: number },
  fillProbability: number,
  rng: () => number
): boolean[][] => {
  return Array.from({ length: size.rows }, () =>
    Array.from({ length: size.columns }, () => rng() < fillProbability)
  )
}

const hintsForLine = (line: boolean[]): number[] => {
  const hints: number[] = []
  let count = 0

  for (let i = 0; i < line.length; i++) {
    if (line[i]) {
      count++
    } else if (count > 0) {
      hints.push(count)
      count = 0
    }
  }

  if (count > 0) {
    hints.push(count)
  }

  return hints.length ? hints : [0]
}

export const generateHints = (
  grid: boolean[][]
): { rowHints: number[][]; columnHints: number[][] } => {
  const rowHints = grid.map(hintsForLine)

  const columnHints = Array.from({ length: grid[0].length }, (_, col) =>
    hintsForLine(grid.map((row) => row[col]))
  )

  return { rowHints, columnHints }
}

/** Pack a boolean grid into one number per row (safe for grids up to ~53 cols). */
export const packGrid = (grid: boolean[][]): number[] =>
  grid.map((row) =>
    row.reduce((acc, cell, i) => acc + (cell ? 1 << i : 0), 0)
  )

/** Unpack a packed grid back into booleans. */
export const unpackGrid = (packed: number[], cols: number): boolean[][] =>
  packed.map((num) =>
    Array.from({ length: cols }, (_, i) => Boolean(num & (1 << i)))
  )
