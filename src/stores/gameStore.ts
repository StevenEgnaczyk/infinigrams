import { create } from 'zustand'
import {
  NonogramGame,
  Difficulty,
  GridSize,
  ImageProcessingOptions,
} from '../types/gameTypes'
import seedrandom from 'seedrandom'
import {
  generateValidPuzzle,
  generateHints,
  packGrid,
  unpackGrid,
} from '../utils/puzzleGenerator'
import { processImage } from '../utils/imageProcessor'
import { findNextMove } from '../utils/solverUtils'

interface GameState {
  game: NonogramGame | null
  difficulty: Difficulty
  gridSize: GridSize
  showSolution: boolean
  isVictory: boolean
  startTime: number | null
  endTime: number | null
  currentSeed: string
  isAutoSolving: boolean
  solveSpeed: number
  generateNewGame: (
    size: GridSize,
    difficulty: Difficulty,
    seed?: string
  ) => void
  toggleCell: (
    row: number,
    col: number,
    nextState?: boolean | 'x'
  ) => void
  toggleShowSolution: () => void
  checkSolution: () => void
  generateFromImage: (
    image: File,
    options: ImageProcessingOptions
  ) => Promise<string>
  generateSeedFromImage: (
    image: File,
    options: ImageProcessingOptions
  ) => Promise<string>
  startAutoSolve: () => void
  stopAutoSolve: () => void
  setSolveSpeed: (speed: number) => void
  resetToSetup: () => void
}

let autoSolveTimer: ReturnType<typeof setTimeout> | null = null

const clearAutoSolveTimer = () => {
  if (autoSolveTimer !== null) {
    clearTimeout(autoSolveTimer)
    autoSolveTimer = null
  }
}

const emptyUserGrid = (rows: number, columns: number): (boolean | 'x')[][] =>
  Array.from({ length: rows }, () =>
    Array.from({ length: columns }, () => false as boolean | 'x')
  )

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
    clearAutoSolveTimer()
    set({
      game: null,
      isVictory: false,
      showSolution: false,
      startTime: null,
      endTime: null,
      isAutoSolving: false,
      currentSeed: '',
    })
  },

  generateNewGame: (size: GridSize, difficulty: Difficulty, seed?: string) => {
    clearAutoSolveTimer()

    try {
      if (seed?.startsWith('img_')) {
        const encodedData = seed.substring(4)
        const parsed = JSON.parse(atob(encodedData)) as {
          g: number[]
          t?: number
          s: [number, number]
        }
        const [rows, cols] = parsed.s
        const grid = unpackGrid(parsed.g, cols)
        const { rowHints, columnHints } = generateHints(grid)

        set({
          game: {
            solution: grid,
            userGrid: emptyUserGrid(grid.length, grid[0].length),
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
          isAutoSolving: false,
        })
        return
      }

      const newSeed = seed || Math.random().toString(36).substring(2, 9)
      const rng = seedrandom(newSeed)
      const fillProbability =
        difficulty === 'easy' ? 0.7 : difficulty === 'medium' ? 0.5 : 0.3

      const solution = generateValidPuzzle(size, fillProbability, rng)
      const { rowHints, columnHints } = generateHints(solution)

      set({
        game: {
          solution,
          userGrid: emptyUserGrid(size.rows, size.columns),
          rowHints,
          columnHints,
        },
        gridSize: size,
        difficulty,
        isVictory: false,
        showSolution: false,
        startTime: null,
        endTime: null,
        currentSeed: newSeed,
        isAutoSolving: false,
      })
    } catch (error) {
      console.error('Failed to generate game from seed:', error)
      if (seed?.startsWith('img_')) {
        // Don't recurse forever on a bad image seed — clear and surface the failure.
        set({ game: null, currentSeed: '' })
        throw error
      }
      const fallbackSeed = Math.random().toString(36).substring(2, 9)
      get().generateNewGame(size, difficulty, fallbackSeed)
    }
  },

  toggleCell: (row: number, col: number, nextState?: boolean | 'x') => {
    set((state) => {
      if (!state.game) return state

      const startTime = state.startTime || Date.now()
      const newUserGrid = state.game.userGrid.map((r, rowIndex) =>
        rowIndex === row
          ? r.map((cell, colIndex) => {
              if (colIndex !== col) return cell
              if (nextState !== undefined) return nextState
              return cell === false ? true : cell === true ? 'x' : false
            })
          : r
      )

      return {
        ...state,
        startTime,
        game: { ...state.game, userGrid: newUserGrid },
      }
    })
    get().checkSolution()
  },

  toggleShowSolution: () => {
    clearAutoSolveTimer()
    set((state) => {
      const newShowSolution = !state.showSolution
      return {
        ...state,
        showSolution: newShowSolution,
        isAutoSolving: false,
        isVictory: newShowSolution ? true : state.isVictory,
        endTime:
          newShowSolution && !state.endTime ? Date.now() : state.endTime,
        game: state.game
          ? {
              ...state.game,
              userGrid: newShowSolution
                ? state.game.solution.map((row) =>
                    row.map((cell) => (cell ? true : false))
                  )
                : state.game.userGrid,
            }
          : null,
      }
    })
  },

  checkSolution: () => {
    set((state) => {
      if (!state.game) return state

      const isCorrect = state.game.solution.every((row, i) =>
        row.every(
          (cell, j) =>
            (cell && state.game!.userGrid[i][j] === true) ||
            (!cell && state.game!.userGrid[i][j] !== true)
        )
      )

      if (isCorrect && !state.isVictory) {
        clearAutoSolveTimer()
        return {
          ...state,
          isVictory: true,
          isAutoSolving: false,
          endTime: Date.now(),
        }
      }

      return state
    })
  },

  generateSeedFromImage: async (
    image: File,
    options: ImageProcessingOptions
  ): Promise<string> => {
    const grid = await processImage(image, options)
    const seedData = {
      g: packGrid(grid),
      t: options.threshold,
      s: [grid.length, grid[0].length] as [number, number],
    }
    return `img_${btoa(JSON.stringify(seedData))}`
  },

  generateFromImage: async (image: File, options: ImageProcessingOptions) => {
    clearAutoSolveTimer()
    const grid = await processImage(image, options)
    const { rowHints, columnHints } = generateHints(grid)
    const size: GridSize = {
      rows: grid.length,
      columns: grid[0].length,
    }
    const imageSeed = await get().generateSeedFromImage(image, options)

    set({
      game: {
        solution: grid,
        userGrid: emptyUserGrid(size.rows, size.columns),
        rowHints,
        columnHints,
      },
      gridSize: size,
      difficulty: 'custom',
      isVictory: false,
      showSolution: false,
      startTime: null,
      endTime: null,
      currentSeed: imageSeed,
      isAutoSolving: false,
    })

    return imageSeed
  },

  setSolveSpeed: (speed: number) => {
    set({ solveSpeed: speed })
  },

  startAutoSolve: () => {
    const state = get()
    if (!state.game || state.showSolution || state.isVictory) return

    if (state.isAutoSolving) {
      get().stopAutoSolve()
      return
    }

    set({ isAutoSolving: true })

    const solveStep = () => {
      const currentState = get()
      if (!currentState.isAutoSolving || !currentState.game) return

      const move = findNextMove(currentState.game)
      if (!move) {
        get().stopAutoSolve()
        return
      }

      const baseDelay = 1000
      const delay = baseDelay / (currentState.solveSpeed * 2)

      autoSolveTimer = setTimeout(() => {
        if (!get().isAutoSolving) return
        get().toggleCell(move.row, move.col, move.value)
        if (get().isAutoSolving && !get().isVictory) {
          solveStep()
        }
      }, delay)
    }

    solveStep()
  },

  stopAutoSolve: () => {
    clearAutoSolveTimer()
    set({ isAutoSolving: false })
  },
}))
