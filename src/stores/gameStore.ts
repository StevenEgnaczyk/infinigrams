import { create } from 'zustand';
import { NonogramGame, Difficulty, GridSize, ImageProcessingOptions } from '../types/gameTypes';
import seedrandom from 'seedrandom';
import { generateValidPuzzle, generateHints } from '../utils/puzzleGenerator';
import { processImage } from '../utils/imageProcessor';
import { findNextMove } from '../utils/solverUtils';

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
}

const validatePuzzle = (solution: boolean[][]): boolean => {
  const rows = solution.length;
  const cols = solution[0].length;
  
  // Check each row and column has at least one filled cell
  const hasEmptyLine = solution.some(row => row.every(cell => !cell)) ||
    Array(cols).fill(0).some((_, col) => solution.every(row => !row[col]));
  
  if (hasEmptyLine) return false;
  
  // Check for isolated cells (cells with no adjacent filled cells)
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      if (solution[i][j]) {
        const hasAdjacent = (
          (i > 0 && solution[i-1][j]) ||
          (i < rows-1 && solution[i+1][j]) ||
          (j > 0 && solution[i][j-1]) ||
          (j < cols-1 && solution[i][j+1])
        );
        if (!hasAdjacent) return false;
      }
    }
  }
  
  return true;
};

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
  
  generateNewGame: (size: GridSize, difficulty: Difficulty, seed?: string) => {
    try {
      if (seed?.startsWith('img_')) {
        const encodedData = seed.substring(4);
        const { g: compactGrid, t: threshold, s: [rows, cols] } = JSON.parse(atob(encodedData));
        
        // Convert compact representation back to grid
        const grid = compactGrid.map(num => 
          Array(cols).fill(0).map((_, i) => !!(num & Math.pow(2, i % 8)))
        );
        
        const { rowHints, columnHints } = generateHints(grid);
        
        const game: NonogramGame = {
          solution: grid,
          userGrid: Array(grid.length).fill(0).map(() => Array(grid[0].length).fill(false)),
          rowHints,
          columnHints
        };
        
        set({ 
          game,
          gridSize: { rows, columns: cols },
          difficulty: 'custom',
          isVictory: false,
          showSolution: false,
          startTime: null,
          endTime: null,
          currentSeed: seed
        });
        return;
      }

      // Regular random puzzle generation
      const newSeed = seed || Math.random().toString(36).substring(7);
      const rng = seedrandom(newSeed);
      const fillProbability = difficulty === 'easy' ? 0.7 : 
                            difficulty === 'medium' ? 0.5 : 0.3;
      
      const solution = generateValidPuzzle(size, fillProbability, rng);
      const { rowHints, columnHints } = generateHints(solution);
      
      const game: NonogramGame = {
        solution,
        userGrid: Array(size.rows).fill(0).map(() => 
          Array(size.columns).fill(false)
        ),
        rowHints,
        columnHints
      };
      
      set({ 
        game,
        gridSize: size,
        difficulty,
        isVictory: false,
        showSolution: false,
        startTime: null,
        endTime: null,
        currentSeed: newSeed
      });
    } catch (error) {
      console.error('Failed to generate game from seed:', error);
      const fallbackSeed = Math.random().toString(36).substring(7);
      get().generateNewGame(size, difficulty, fallbackSeed);
    }
  },

  toggleCell: (row: number, col: number, nextState?: boolean | 'x') => {
    set(state => {
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
        game: { ...state.game, userGrid: newUserGrid }
      };
    });
    get().checkSolution();
  },

  toggleShowSolution: () => {
    set(state => {
      const newShowSolution = !state.showSolution;
      return {
        ...state,
        showSolution: newShowSolution,
        isVictory: newShowSolution ? true : state.isVictory,
        endTime: newShowSolution && !state.endTime ? Date.now() : state.endTime,
        game: state.game ? {
          ...state.game,
          userGrid: newShowSolution 
            ? state.game.solution.map(row => row.map(cell => cell ? true : false))
            : state.game.userGrid
        } : null
      };
    });
  },

  checkSolution: () => {
    set(state => {
      if (!state.game) return state;

      const isCorrect = state.game.solution.every((row, i) =>
        row.every((cell, j) => 
          (cell && state.game!.userGrid[i][j] === true) ||
          (!cell && state.game!.userGrid[i][j] !== true)
        )
      );

      if (isCorrect && !state.isVictory) {
        return {
          ...state,
          isVictory: true,
          endTime: Date.now()
        };
      }

      return state;
    });
  },

  generateSeedFromImage: async (image: File, options: ImageProcessingOptions): Promise<string> => {
    try {
      const grid = await processImage(image, options);
      // Convert grid to more compact representation
      const compactGrid = grid.map(row => 
        row.reduce((acc, cell, i) => acc + (cell ? Math.pow(2, i % 8) : 0), 0)
      );
      
      const seedData = {
        g: compactGrid,
        t: options.threshold,
        s: [options.maxSize.rows, options.maxSize.columns]
      };
      
      const seed = `img_${btoa(JSON.stringify(seedData))}`;
      return seed;
    } catch (error) {
      console.error('Failed to generate seed:', error);
      throw error;
    }
  },

  generateFromImage: async (image: File, options: ImageProcessingOptions) => {
    try {
      const grid = await processImage(image, options);
      const { rowHints, columnHints } = generateHints(grid);
      
      const size: GridSize = {
        rows: grid.length,
        columns: grid[0].length
      };
      
      const imageSeed = await get().generateSeedFromImage(image, options);
      
      const game: NonogramGame = {
        solution: grid,
        userGrid: Array(size.rows).fill(0).map(() => 
          Array(size.columns).fill(false)
        ),
        rowHints,
        columnHints
      };
      
      set({ 
        game,
        gridSize: size,
        difficulty: 'custom',
        isVictory: false,
        showSolution: false,
        startTime: null,
        endTime: null,
        currentSeed: imageSeed
      });
      
      return imageSeed;
    } catch (error) {
      console.error('Failed to process image:', error);
      throw error;
    }
  },

  setSolveSpeed: (speed: number) => {
    set({ solveSpeed: speed });
  },

  startAutoSolve: () => {
    const state = get();
    if (!state.game || state.showSolution || state.isVictory) return;

    // Toggle solving state
    set(state => ({ isAutoSolving: !state.isAutoSolving }));
    
    if (!get().isAutoSolving) return; // If we just turned it off, return

    // Start with zoomed out view
    set(state => ({
      ...state,
      isZoomedOut: true
    }));

    // Start the solving process
    const solveStep = async () => {
      const currentState = get();
      if (!currentState.isAutoSolving || !currentState.game) return;

      // Find the next move
      const move = findNextMove(currentState.game);
      if (!move) {
        // No more moves found, stop solving
        get().stopAutoSolve();
        return;
      }

      // Apply the move with a delay based on speed setting
      const baseDelay = 1000;
      const delay = baseDelay / (currentState.solveSpeed * 2);
      await new Promise(resolve => setTimeout(resolve, delay));
      
      if (get().isAutoSolving) { // Check if we're still solving
        get().toggleCell(move.row, move.col, move.value);
        // Schedule next move
        solveStep();
      }
    };

    solveStep();
  },

  stopAutoSolve: () => {
    set({ isAutoSolving: false });
  },
})); 