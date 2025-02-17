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

export interface GameState {
  game: NonogramGame | null;
  difficulty: Difficulty;
  gridSize: GridSize;
  showSolution: boolean;
  isVictory: boolean;
  startTime: number | null;
  endTime: number | null;
  currentSeed: string;
  generateNewGame: (size: GridSize, difficulty: Difficulty, seed?: string) => void;
  generateFromImage: (image: File, options: ImageProcessingOptions) => Promise<string>;
  toggleCell: (row: number, col: number, nextState?: boolean | 'x') => void;
  toggleShowSolution: () => void;
  checkSolution: () => void;
} 