import { NonogramGame } from '../types/gameTypes';

interface SolveMove {
  row: number;
  col: number;
  value: boolean | 'x';
  confidence: number; // Higher means more certain
  reason: string; // For debugging/visualization
}

// Check if current line state matches or could match the hints
function validateLineAgainstHints(line: (boolean | 'x')[], hints: number[]): boolean {
  // Get current blocks in the line
  const currentBlocks: number[] = [];
  let currentBlock = 0;
  
  for (let i = 0; i < line.length; i++) {
    if (line[i] === true) {
      currentBlock++;
    } else if (currentBlock > 0) {
      currentBlocks.push(currentBlock);
      currentBlock = 0;
    }
  }
  if (currentBlock > 0) {
    currentBlocks.push(currentBlock);
  }

  // Check if current blocks violate hints
  for (let i = 0; i < currentBlocks.length; i++) {
    if (i >= hints.length || currentBlocks[i] > hints[i]) {
      return false;
    }
  }

  // Check if remaining space could fit remaining hints
  const remainingSpace = line.filter(cell => cell === false).length;
  const remainingHints = hints.slice(currentBlocks.length);
  const neededSpace = remainingHints.reduce((sum, hint) => sum + hint, 0) + Math.max(0, remainingHints.length - 1);
  
  return remainingSpace >= neededSpace;
}

function canPlaceBlock(line: (boolean | 'x')[], start: number, length: number): boolean {
  // Check if we can place a block of given length at the start position
  for (let i = 0; i < length; i++) {
    if (line[start + i] === 'x') return false;
  }
  // Check if block is bounded by x's or edges
  if (start > 0 && line[start - 1] === true) return false;
  if (start + length < line.length && line[start + length] === true) return false;
  return true;
}

// Check if a line can be partially solved based on its hints
function analyzeLine(
  line: (boolean | 'x')[],
  hints: number[],
  isRow: boolean,
  lineIndex: number
): SolveMove[] {
  const moves: SolveMove[] = [];
  const lineLength = line.length;
  
  // If no hints, all empty cells should be X
  if (hints.length === 1 && hints[0] === 0) {
    line.forEach((cell, i) => {
      if (cell === false) {
        moves.push({
          row: isRow ? lineIndex : i,
          col: isRow ? i : lineIndex,
          value: 'x',
          confidence: 1,
          reason: 'Empty line'
        });
      }
    });
    return moves;
  }

  // Find definite cells by checking possible positions for each block
  const possiblePositions = new Array(lineLength).fill(true);
  
  hints.forEach((blockLength) => {
    const blockPositions = new Array(lineLength).fill(false);
    
    // Try placing the block at each position
    for (let start = 0; start <= lineLength - blockLength; start++) {
      if (canPlaceBlock(line, start, blockLength)) {
        // Create a test line with this block placement
        const testLine = [...line];
        for (let i = 0; i < blockLength; i++) {
          testLine[start + i] = true;
        }
        
        // Only consider this position if it doesn't violate hints
        if (validateLineAgainstHints(testLine, hints)) {
          for (let i = 0; i < blockLength; i++) {
            blockPositions[start + i] = true;
          }
        }
      }
    }
    
    // Update possible positions
    for (let i = 0; i < lineLength; i++) {
      possiblePositions[i] = possiblePositions[i] && blockPositions[i];
    }
  });

  // Add moves for definite positions
  possiblePositions.forEach((possible, i) => {
    if (possible && line[i] === false) {
      // Verify this move doesn't violate hints
      const testLine = [...line];
      testLine[i] = true;
      if (validateLineAgainstHints(testLine, hints)) {
        moves.push({
          row: isRow ? lineIndex : i,
          col: isRow ? i : lineIndex,
          value: true,
          confidence: 1,
          reason: 'Definite cell'
        });
      }
    }
  });

  // Mark impossible positions as X
  possiblePositions.forEach((possible, i) => {
    if (!possible && line[i] === false) {
      // Verify this X doesn't prevent completing the hints
      const testLine = [...line];
      testLine[i] = 'x';
      if (validateLineAgainstHints(testLine, hints)) {
        moves.push({
          row: isRow ? lineIndex : i,
          col: isRow ? i : lineIndex,
          value: 'x',
          confidence: 0.8,
          reason: 'Impossible position'
        });
      }
    }
  });

  return moves;
}

function checkLineComplete(line: (boolean | 'x')[], hints: number[]): boolean {
  const blocks = line.reduce((acc, cell, i) => {
    if (cell === true && (!acc.length || line[i - 1] !== true)) {
      acc.push(1);
    } else if (cell === true) {
      acc[acc.length - 1]++;
    }
    return acc;
  }, [] as number[]);
  
  return hints.length === blocks.length && hints.every((h, i) => h === blocks[i]);
}

export function findNextMove(game: NonogramGame): SolveMove | null {
  const moves: SolveMove[] = [];
  
  // Analyze rows
  game.userGrid.forEach((row, rowIndex) => {
    const rowMoves = analyzeLine(row, game.rowHints[rowIndex], true, rowIndex);
    moves.push(...rowMoves);
  });

  // Analyze columns
  for (let colIndex = 0; colIndex < game.userGrid[0].length; colIndex++) {
    const column = game.userGrid.map(row => row[colIndex]);
    const colMoves = analyzeLine(column, game.columnHints[colIndex], false, colIndex);
    moves.push(...colMoves);
  }

  // Sort moves by confidence and prioritize filling cells over X's
  moves.sort((a, b) => {
    if (a.value === true && b.value !== true) return -1;
    if (b.value === true && a.value !== true) return 1;
    return b.confidence - a.confidence;
  });

  return moves.length > 0 ? moves[0] : null;
} 