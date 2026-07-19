export type Difficulty = 'easy' | 'medium' | 'hard' | 'custom';

export interface GridSize {
  rows: number;
  columns: number;
}

export interface NonogramGame {
  solution: boolean[][];
  userGrid: (boolean | 'x')[][];
  rowHints: number[][];
  columnHints: number[][];
}

export interface ImageProcessingOptions {
  threshold: number;
  maxSize: GridSize;
}
