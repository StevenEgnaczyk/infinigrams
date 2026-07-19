import { create } from 'zustand';
import { NonogramGame, Difficulty, GridSize, ImageProcessingOptions } from '../types/gameTypes';
import seedrandom from 'seedrandom';
import { generateValidPuzzle, generateHints } from '../utils/puzzleGenerator';
import { processImage } from '../utils/imageProcessor';
import { findNextMove } from '../utils/solverUtils';
import { decodeImageSeed, encodeImageSeed } from '../utils/seedCodec';

interface GameState {
  game: NonogramGame | null;
  difficulty: Difficulty;
  gridSize: GridSize;
  showSolution: boolean;
  isVictory: boolean;
  startTime: number | null;
  endTime: number | null;
  currentSeed: string;
  isAutoSolving: boolean;
  solveSpeed: number;
  isZoomedOut: boolean;
  savedUserGrid: (boolean | 'x')[][] | null;
  generateNewGame: (size: GridSize, difficulty: Difficulty, seed?: string) => void;
  toggleCell: (row: number, col: number, nextState?: boolean | 'x') => void;
  toggleShowSolution: () => void;
  checkSolution: () => void;
  generateFromImage: (image: File, options: ImageProcessingOptions) => Promise<string>;
  generateSeedFromImage: (image: File, options: ImageProcessingOptions) => Promise<string>;
  startAutoSolve: () => void;
  stopAutoSolve: () => void;
  setSolveSpeed: (speed: number) => void;
  resetToSetup: () => void;
}

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
  isZoomedOut: false,
  savedUserGrid: null,

  resetToSetup: () => {
    get().stopAutoSolve();
    set({
      game: null,
      showSolution: false,
      isVictory: false,
      startTime: null,
      endTime: null,
      isZoomedOut: false,
      savedUserGrid: null,
    });
  },

  generateNewGame: (size: GridSize, difficulty: Difficulty, seed?: string) => {
    try {
      get().stopAutoSolve();

      if (seed?.startsWith('img_')) {
        const { grid, rows, cols } = decodeImageSeed(seed);
        const { rowHints, columnHints } = generateHints(grid);

        const game: NonogramGame = {
          solution: grid,
          userGrid: Array.from({ length: grid.length }, () =>
            Array.from({ length: grid[0].length }, () => false as boolean | 'x')
          ),
          rowHints,
          columnHints,
        };

        set({
          game,
          gridSize: { rows, columns: cols },
          difficulty: 'custom',
          isVictory: false,
          showSolution: false,
          startTime: null,
          endTime: null,
          currentSeed: seed,
          isZoomedOut: false,
          savedUserGrid: null,
        });
        return;
      }

      const newSeed = seed || Math.random().toString(36).substring(2, 9);
      const rng = seedrandom(newSeed);
      const fillProbability =
        difficulty === 'easy' ? 0.7 : difficulty === 'medium' ? 0.5 : 0.3;

      const solution = generateValidPuzzle(size, fillProbability, rng);
      const { rowHints, columnHints } = generateHints(solution);

      const game: NonogramGame = {
        solution,
        userGrid: Array.from({ length: size.rows }, () =>
          Array.from({ length: size.columns }, () => false as boolean | 'x')
        ),
        rowHints,
        columnHints,
      };

      set({
        game,
        gridSize: size,
        difficulty,
        isVictory: false,
        showSolution: false,
        startTime: null,
        endTime: null,
        currentSeed: newSeed,
        isZoomedOut: false,
        savedUserGrid: null,
      });
    } catch (error) {
      console.error('Failed to generate game from seed:', error);
      if (seed) {
        const fallbackSeed = Math.random().toString(36).substring(2, 9);
        get().generateNewGame(size, difficulty, fallbackSeed);
      }
    }
  },

  toggleCell: (row: number, col: number, nextState?: boolean | 'x') => {
    const { game, isVictory, showSolution, isAutoSolving } = get();
    if (!game || isVictory || (showSolution && !isAutoSolving)) return;

    set((state) => {
      if (!state.game) return state;

      const startTime = state.startTime || Date.now();
      const newUserGrid = state.game.userGrid.map((r, rowIndex) =>
        rowIndex === row
          ? r.map((cell, colIndex) => {
              if (colIndex !== col) return cell;
              if (nextState !== undefined) return nextState;
              return cell === false ? true : cell === true ? 'x' : false;
            })
          : r
      );

      return {
        ...state,
        startTime,
        game: { ...state.game, userGrid: newUserGrid },
      };
    });

    get().checkSolution();
  },

  toggleShowSolution: () => {
    get().stopAutoSolve();
    set((state) => {
      if (!state.game) return state;

      const newShowSolution = !state.showSolution;

      if (newShowSolution) {
        return {
          ...state,
          showSolution: true,
          isZoomedOut: true,
          savedUserGrid: state.game.userGrid.map((row) => [...row]),
          game: {
            ...state.game,
            userGrid: state.game.solution.map((row) =>
              row.map((cell) => (cell ? true : (false as boolean | 'x')))
            ),
          },
        };
      }

      return {
        ...state,
        showSolution: false,
        isZoomedOut: false,
        savedUserGrid: null,
        game: {
          ...state.game,
          userGrid:
            state.savedUserGrid?.map((row) => [...row]) ??
            state.game.userGrid,
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
        ...state,
        isVictory: true,
        endTime: Date.now(),
        isAutoSolving: false,
        isZoomedOut: true,
      };
    });
  },

  generateSeedFromImage: async (
    image: File,
    options: ImageProcessingOptions
  ): Promise<string> => {
    const grid = await processImage(image, options);
    return encodeImageSeed(grid, options.threshold);
  },

  generateFromImage: async (image: File, options: ImageProcessingOptions) => {
    get().stopAutoSolve();
    const grid = await processImage(image, options);
    const { rowHints, columnHints } = generateHints(grid);

    const size: GridSize = {
      rows: grid.length,
      columns: grid[0].length,
    };

    const imageSeed = encodeImageSeed(grid, options.threshold);

    const game: NonogramGame = {
      solution: grid,
      userGrid: Array.from({ length: size.rows }, () =>
        Array.from({ length: size.columns }, () => false as boolean | 'x')
      ),
      rowHints,
      columnHints,
    };

    set({
      game,
      gridSize: size,
      difficulty: 'custom',
      isVictory: false,
      showSolution: false,
      startTime: null,
      endTime: null,
      currentSeed: imageSeed,
      isZoomedOut: false,
      savedUserGrid: null,
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

    set({ isAutoSolving: true, isZoomedOut: true });

    const solveStep = async () => {
      const currentState = get();
      if (!currentState.isAutoSolving || !currentState.game) return;

      const move = findNextMove(currentState.game);
      if (!move) {
        get().stopAutoSolve();
        return;
      }

      const baseDelay = 1000;
      const delay = baseDelay / (currentState.solveSpeed * 2);
      await new Promise((resolve) => setTimeout(resolve, delay));

      if (get().isAutoSolving) {
        get().toggleCell(move.row, move.col, move.value);
        if (get().isAutoSolving && !get().isVictory) {
          void solveStep();
        }
      }
    };

    void solveStep();
  },

  stopAutoSolve: () => {
    set({ isAutoSolving: false });
  },
}));
