import { NonogramGame } from '../types/gameTypes'

interface SolveMove {
  row: number
  col: number
  value: boolean | 'x'
  confidence: number
  reason: string
}

function validateLineAgainstHints(
  line: (boolean | 'x')[],
  hints: number[]
): boolean {
  const currentBlocks: number[] = []
  let currentBlock = 0

  for (let i = 0; i < line.length; i++) {
    if (line[i] === true) {
      currentBlock++
    } else if (currentBlock > 0) {
      currentBlocks.push(currentBlock)
      currentBlock = 0
    }
  }
  if (currentBlock > 0) {
    currentBlocks.push(currentBlock)
  }

  for (let i = 0; i < currentBlocks.length; i++) {
    if (i >= hints.length || currentBlocks[i] > hints[i]) {
      return false
    }
  }

  const remainingSpace = line.filter((cell) => cell === false).length
  const remainingHints = hints.slice(currentBlocks.length)
  const neededSpace =
    remainingHints.reduce((sum, hint) => sum + hint, 0) +
    Math.max(0, remainingHints.length - 1)

  return remainingSpace >= neededSpace
}

function canPlaceBlock(
  line: (boolean | 'x')[],
  start: number,
  length: number
): boolean {
  for (let i = 0; i < length; i++) {
    if (line[start + i] === 'x') return false
  }
  if (start > 0 && line[start - 1] === true) return false
  if (start + length < line.length && line[start + length] === true) {
    return false
  }
  return true
}

function analyzeLine(
  line: (boolean | 'x')[],
  hints: number[],
  isRow: boolean,
  lineIndex: number
): SolveMove[] {
  const moves: SolveMove[] = []
  const lineLength = line.length

  if (hints.length === 1 && hints[0] === 0) {
    line.forEach((cell, i) => {
      if (cell === false) {
        moves.push({
          row: isRow ? lineIndex : i,
          col: isRow ? i : lineIndex,
          value: 'x',
          confidence: 1,
          reason: 'Empty line',
        })
      }
    })
    return moves
  }

  const possiblePositions = new Array(lineLength).fill(true)

  hints.forEach((blockLength) => {
    const blockPositions = new Array(lineLength).fill(false)

    for (let start = 0; start <= lineLength - blockLength; start++) {
      if (!canPlaceBlock(line, start, blockLength)) continue

      const testLine = [...line]
      for (let i = 0; i < blockLength; i++) {
        testLine[start + i] = true
      }

      if (validateLineAgainstHints(testLine, hints)) {
        for (let i = 0; i < blockLength; i++) {
          blockPositions[start + i] = true
        }
      }
    }

    for (let i = 0; i < lineLength; i++) {
      possiblePositions[i] = possiblePositions[i] && blockPositions[i]
    }
  })

  possiblePositions.forEach((possible, i) => {
    if (possible && line[i] === false) {
      const testLine = [...line]
      testLine[i] = true
      if (validateLineAgainstHints(testLine, hints)) {
        moves.push({
          row: isRow ? lineIndex : i,
          col: isRow ? i : lineIndex,
          value: true,
          confidence: 1,
          reason: 'Definite cell',
        })
      }
    }
  })

  possiblePositions.forEach((possible, i) => {
    if (!possible && line[i] === false) {
      const testLine = [...line]
      testLine[i] = 'x'
      if (validateLineAgainstHints(testLine, hints)) {
        moves.push({
          row: isRow ? lineIndex : i,
          col: isRow ? i : lineIndex,
          value: 'x',
          confidence: 0.8,
          reason: 'Impossible position',
        })
      }
    }
  })

  return moves
}

export function findNextMove(game: NonogramGame): SolveMove | null {
  const moves: SolveMove[] = []

  game.userGrid.forEach((row, rowIndex) => {
    moves.push(...analyzeLine(row, game.rowHints[rowIndex], true, rowIndex))
  })

  for (let colIndex = 0; colIndex < game.userGrid[0].length; colIndex++) {
    const column = game.userGrid.map((row) => row[colIndex])
    moves.push(
      ...analyzeLine(column, game.columnHints[colIndex], false, colIndex)
    )
  }

  moves.sort((a, b) => {
    if (a.value === true && b.value !== true) return -1
    if (b.value === true && a.value !== true) return 1
    return b.confidence - a.confidence
  })

  return moves.length > 0 ? moves[0] : null
}
