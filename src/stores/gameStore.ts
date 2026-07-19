import { create } from 'zustand';
import { NonogramGame, Difficulty, GridSize, ImageProcessingOptions } from '../types/gameTypes';
import seedrandom from 'seedrandom';
import { generateValidPuzzle, generateHints } from '../utils/puzzleGenerator';
import { processImage } from '../utils/imageProcessor';
import { findNextMove } from '../utils/solverUtils';
import {
  createRandomSeed,
  decodeImageSeed,
  encodeImageSeed,
  parseRandomSeed,
} from '../utils/seedUtils';

interface GameState {
  game: NonogramGame | null;
  difficulty: Difficulty;
  gridSize: GridSize;
  showSolution: boolean;
  isVictory: boolean;
  startTime: number | null;
  endTime: number | null;
  currentSeed: string;
  generateNewGame: (size: GridSize, difficulty: Difficulty, seed?: string) => void;
  toggleCell: (row: number, col: number, nextState?: boolean | 'x') => void;
  toggleShowSolution: () => void;
  checkSolution: () => void;
  generateFromImage: (image: File, options: ImageProcessingOptions) => Promise<string>;
  generateSeedFromImage: (image: File, options: ImageProcessingOptions) => Promise<string>;
  isAutoSolving: boolean;
  solveSpeed: number;
  startAutoSolve: () => void;
  stopAutoSolve: () => void;
  setSolveSpeed: (speed: number) => void;
  resetToSetup: () => void;
}

const createEmptyUserGrid = (rows: number, columns: number): (boolean | 'x')[][] =>
  Array.from({ length: rows }, () => Array.from({ length: columns }, () => false as boolean | 'x'));

export const useGameStore = create<GameState>((set, get) => ({
  game: null,
  difficulty: 'medium',
  gridSize: { rows: 5, columns: 5 },
  showSolution: false,
  isVictory: false,
  startTime: null,
  endTime: null,
  currentSeed: '',
  isAutoSolving: false,
  solveSpeed: 3,

  resetToSetup: () => {
    get().stopAutoSolve();
    set({
      game: null,
      isVictory: false,
      showSolution: false,
      startTime: null,
      endTime: null,
    });
  },

  generateNewGame: (size: GridSize, difficulty: Difficulty, seed?: string) => {
    try {
      get().stopAutoSolve();

      if (seed?.startsWith('img_')) {
        const { grid, rows, cols } = decodeImageSeed(seed);
        const { rowHints, columnHints } = generateHints(grid);

        set({
          game: {
            solution: grid,
            userGrid: createEmptyUserGrid(grid.length, grid[0].length),
            rowHints,
            columnHints,
          },
          gridSize: { rows, columns: cols },
          difficulty: 'custom',
          isVictory: false,
          showSolution: false,
          startTime: null,
          endTime: null,
          currentSeed: seed,
        });
        return;
      }

      const parsed = seed
        ? parseRandomSeed(seed, size, difficulty === 'custom' ? 'medium' : difficulty)
        : createRandomSeed(size, difficulty === 'custom' ? 'medium' : difficulty);

      const rng = seedrandom(parsed.rngSeed);
      const fillProbability =
        parsed.difficulty === 'easy' ? 0.7 : parsed.difficulty === 'medium' ? 0.5 : 0.3;

      const solution = generateValidPuzzle(parsed.size, fillProbability, rng);
      const { rowHints, columnHints } = generateHints(solution);

      set({
        game: {
          solution,
          userGrid: createEmptyUserGrid(parsed.size.rows, parsed.size.columns),
          rowHints,
          columnHints,
        },
        gridSize: parsed.size,
        difficulty: parsed.difficulty,
        isVictory: false,
        showSolution: false,
        startTime: null,
        endTime: null,
        currentSeed: parsed.fullSeed,
      });
    } catch (error) {
      console.error('Failed to generate game from seed:', error);
      if (seed) {
        // Avoid infinite recursion on bad seeds by falling back to a fresh puzzle.
        get().generateNewGame(size, difficulty === 'custom' ? 'medium' : difficulty);
        return;
      }
      throw error;
    }
  },

  toggleCell: (row: number, col: number, nextState?: boolean | 'x') => {
    const state = get();
    if (!state.game || state.isVictory || state.showSolution) return;

    const startTime = state.startTime ?? Date.now();
    const newUserGrid = state.game.userGrid.map((r, rowIndex) =>
      rowIndex === row
        ? r.map((cell, colIndex) => {
            if (colIndex !== col) return cell;
            if (nextState !== undefined) return nextState;
            return cell === false ? true : cell === true ? 'x' : false;
          })
        : r
    );

    set({
      startTime,
      game: { ...state.game, userGrid: newUserGrid },
    });

    get().checkSolution();
  },

  toggleShowSolution: () => {
    set((state) => {
      if (!state.game) return state;

      const newShowSolution = !state.showSolution;
      return {
        showSolution: newShowSolution,
        isAutoSolving: false,
        game: {
          ...state.game,
          userGrid: newShowSolution
            ? state.game.solution.map((row) => row.map((cell) => (cell ? true : false)))
            : state.game.userGrid,
        },
      };
    });
  },

  checkSolution: () => {
    set((state) => {
      if (!state.game || state.isVictory) return state;

      const isCorrect = state.game.solution.every((row, i) =>
        row.every(
          (cell, j) =>
            (cell && state.game!.userGrid[i][j] === true) ||
            (!cell && state.game!.userGrid[i][j] !== true)
        )
      );

      if (!isCorrect) return state;

      return {
        isVictory: true,
        endTime: Date.now(),
        isAutoSolving: false,
      };
    });
  },

  generateSeedFromImage: async (image: File, options: ImageProcessingOptions): Promise<string> => {
    const grid = await processImage(image, options);
    return encodeImageSeed(grid, options.threshold);
  },

  generateFromImage: async (image: File, options: ImageProcessingOptions) => {
    get().stopAutoSolve();
    const grid = await processImage(image, options);
    const { rowHints, columnHints } = generateHints(grid);
    const imageSeed = encodeImageSeed(grid, options.threshold);

    set({
      game: {
        solution: grid,
        userGrid: createEmptyUserGrid(grid.length, grid[0].length),
        rowHints,
        columnHints,
      },
      gridSize: { rows: grid.length, columns: grid[0].length },
      difficulty: 'custom',
      isVictory: false,
      showSolution: false,
      startTime: null,
      endTime: null,
      currentSeed: imageSeed,
    });

    return imageSeed;
  },

  setSolveSpeed: (speed: number) => {
    set({ solveSpeed: speed });
  },

  startAutoSolve: () => {
    const state = get();
    if (!state.game || state.showSolution || state.isVictory) return;

    if (state.isAutoSolving) {
      get().stopAutoSolve();
      return;
    }

    set({ isAutoSolving: true });

    const solveStep = async () => {
      const currentState = get();
      if (!currentState.isAutoSolving || !currentState.game) return;

      const move = findNextMove(currentState.game);
      if (!move) {
        get().stopAutoSolve();
        return;
      }

      const delay = 1000 / (currentState.solveSpeed * 2);
      await new Promise((resolve) => setTimeout(resolve, delay));

      if (!get().isAutoSolving) return;

      get().toggleCell(move.row, move.col, move.value);
      void solveStep();
    };

    void solveStep();
  },

  stopAutoSolve: () => {
    set({ isAutoSolving: false });
  },
}));
