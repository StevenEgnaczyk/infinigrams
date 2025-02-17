import { type ReactElement, useState, useEffect, useRef } from 'react';
import React from 'react';
import { NonogramGame, GridSize } from '../types/gameTypes';
import { useGameStore } from '../stores/gameStore';
import { formatTime } from '../utils/timeUtils';

interface GameBoardProps {
  game: NonogramGame;
  onCellClick: (row: number, col: number, nextState?: boolean | 'x') => void;
  isVictory: boolean;
  showSolution?: boolean;
  startTime: number | null;
  endTime: number | null;
  currentSeed: string;
}

interface WaveCell {
  row: number;
  col: number;
  intensity: number;
}

export const GameBoard = ({ 
  game, 
  onCellClick, 
  isVictory,
  showSolution,
  startTime,
  endTime,
  currentSeed
}: GameBoardProps): ReactElement => {
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [dragState, setDragState] = useState<boolean | 'x' | null>(null);
  const [activeWave, setActiveWave] = useState<Array<WaveCell>>([]);
  const boardRef = useRef<HTMLDivElement>(null);
  const [showControls, setShowControls] = useState(false);
  const [isFullView, setIsFullView] = useState(false);
  const [isZoomedOut, setIsZoomedOut] = useState(false);
  
  const maxRowHintLength = Math.max(...game.rowHints.map(hints => hints.length));
  const maxColHintLength = Math.max(...game.columnHints.map(hints => hints.length));

  const calculateWaveCells = (currentDiagonal: number, size: number): WaveCell[] => {
    const cells: WaveCell[] = [];
    const maxIntensity = 0.8;
    const waveWidth = 4; // Increased wave width for smoother transition
    
    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size; j++) {
        const distanceFromDiagonal = Math.abs(i + j - currentDiagonal);
        if (distanceFromDiagonal <= waveWidth) {
          const intensity = maxIntensity * Math.cos((distanceFromDiagonal / waveWidth) * Math.PI * 0.5);
          cells.push({ row: i, col: j, intensity });
        }
      }
    }
    
    return cells;
  };

  // Victory animation effect
  useEffect(() => {
    if (!isVictory && !showSolution) return;
    
    const size = game.solution.length;
    // Skip wave animation for large grids
    if (size >= 50) return;
    
    let currentDiagonal = 0;
    const totalDiagonals = 2 * size - 1;
    
    const waveInterval = setInterval(() => {
      const newActiveCells = calculateWaveCells(currentDiagonal, size);
      setActiveWave(newActiveCells);
      currentDiagonal = (currentDiagonal + 1) % (totalDiagonals + 5);
    }, 100);

    return () => clearInterval(waveInterval);
  }, [isVictory, showSolution, game.solution]);

  // Update useEffect to handle zooming on solution reveal
  useEffect(() => {
    if (showSolution || isVictory) {
      setIsFullView(true);
    }
  }, [showSolution, isVictory]);

  // Add useEffect to handle centering when solution is shown
  useEffect(() => {
    if (showSolution || isVictory || isZoomedOut) {
      // Ensure container is scrolled to center
      if (boardRef.current) {
        const container = boardRef.current.querySelector('.overflow-auto');
        if (container) {
          container.scrollTo({
            left: (container.scrollWidth - container.clientWidth) / 2,
            top: (container.scrollHeight - container.clientHeight) / 2,
            behavior: 'smooth'
          });
        }
      }
    }
  }, [showSolution, isVictory, isZoomedOut]);

  const handleCellInteraction = (rowIndex: number, colIndex: number, initialCell: boolean | 'x') => {
    // If starting a drag, set the drag state
    if (!dragState) {
      if (initialCell === false) setDragState(true);
      else if (initialCell === true) setDragState('x');
      else setDragState(false);
    }

    // Use drag state if it exists, otherwise cycle the cell
    const nextState = dragState ?? (
      initialCell === false ? true :
      initialCell === true ? 'x' :
      false
    );

    onCellClick(rowIndex, colIndex, nextState);
  };

  const getCellClassName = (cell: boolean | 'x', rowIndex: number, colIndex: number) => {
    const isCorrectCell = game.solution[rowIndex][colIndex];
    const activeCell = activeWave.find(cell => cell.row === rowIndex && cell.col === colIndex);
    
    if ((isVictory || showSolution) && isCorrectCell) {
      const intensity = activeCell?.intensity ?? 0;
      const scale = 1 + intensity * 0.4;
      return `w-8 h-8 wave-cell
              ${activeCell ? 'wave-active' : 'bg-yellow-600'}
              [--wave-scale:${scale}] [--wave-opacity:${intensity}]`;
    }
    
    if (cell === 'x') {
      return `w-8 h-8 bg-white relative before:absolute before:inset-0 
              before:bg-[linear-gradient(45deg,transparent_45%,#666_45%,#666_55%,transparent_55%)]
              after:absolute after:inset-0
              after:bg-[linear-gradient(-45deg,transparent_45%,#666_45%,#666_55%,transparent_55%)]`;
    }
    
    return `w-8 h-8 ${cell ? 'bg-black' : 'bg-white'}`;
  };

  const calculateFullViewScale = () => {
    if (!boardRef.current) return 1;

    const containerWidth = boardRef.current.clientWidth - 64;
    const containerHeight = boardRef.current.clientHeight - 64;

    const totalRows = game.solution.length + maxColHintLength;
    const totalCols = game.solution[0].length + maxRowHintLength;

    // Calculate total grid size (2rem per cell)
    const gridWidth = totalCols * 32;
    const gridHeight = totalRows * 32;

    // Calculate scale needed to fit
    const scaleX = containerWidth / gridWidth;
    const scaleY = containerHeight / gridHeight;

    // Use the smaller scale to ensure entire grid fits
    return Math.min(scaleX, scaleY, 1) * 0.9;
  };

  const getBorderStyle = (index: number, isRow: boolean) => {
    const isFifth = (index + 1) % 5 === 0;
    const isLast = index === (isRow ? game.userGrid.length : game.userGrid[0].length) - 1;
    return isFifth && !isLast ? 'border-b-2 border-gray-400' : 'border-b border-gray-300';
  };

  const handleSizeChange = (newSize: GridSize) => {
    useGameStore.getState().generateNewGame(newSize, useGameStore.getState().difficulty);
  };

  // Add a function to calculate the appropriate scale based on grid size
  const calculateScale = () => {
    const baseScale = 0.5;
    const gridSize = game.solution.length;
    
    if (gridSize >= 100) return baseScale * 0.20;
    // For massive grids (50x50 and up)
    if (gridSize >= 50) return baseScale * 0.35;
    // For very large grids (30x30 to 49x49)
    if (gridSize >= 30) return baseScale * 0.35;
    // For large grids (20x20 to 29x29)

    if (gridSize >= 20) return baseScale * 0.45;
    // For medium grids (15x15 to 19x19)
    if (gridSize >= 15) return baseScale * 0.7;
    // For smaller grids, use base scale
    return baseScale;
  };

  return (
    <div 
      ref={boardRef}
      className="w-full h-full flex flex-col items-center relative"
      onMouseUp={() => {
        setIsMouseDown(false);
        setDragState(null);
      }}
      onMouseLeave={() => {
        setIsMouseDown(false);
        setDragState(null);
      }}
    >
      {/* Main container */}
      <div className="w-full h-full overflow-auto">
        <div className="min-w-fit min-h-fit p-8 flex items-center justify-center">
          <div 
            className="grid gap-0 border-4 border-black"
            style={{ 
              gridTemplateColumns: `minmax(${maxRowHintLength}rem, auto) repeat(${game.userGrid[0].length}, 2rem)`,
              gridTemplateRows: `minmax(${maxColHintLength}rem, auto) repeat(${game.userGrid.length}, 2rem)`,
              transform: (isVictory || showSolution || isZoomedOut) ? `scale(${calculateScale()})` : 'none',
              transformOrigin: 'center',
              transition: 'transform 0.5s ease-in-out'
            }}
          >
            {/* Top-left empty corner */}
            <div className="bg-gray-200 border-r-4 border-b-4 border-black" />

            {/* Column hints */}
            {game.columnHints.map((hints, colIndex) => (
              <div 
                key={colIndex} 
                className={`bg-gray-200 flex flex-col items-center justify-end pb-1 border-b-4 border-black
                           ${(colIndex + 1) % 5 === 0 ? 'border-r-4' : 'border-r'}`}
              >
                {hints.map((hint, hintIndex) => (
                  <span key={hintIndex} className="text-sm font-bold">{hint}</span>
                ))}
              </div>
            ))}

            {/* Row hints and game grid */}
            {game.userGrid.map((row, rowIndex) => (
              <React.Fragment key={rowIndex}>
                {/* Row hints */}
                <div 
                  className={`bg-gray-200 flex items-center justify-end gap-1 pr-2 border-r-4 border-black
                             ${(rowIndex + 1) % 5 === 0 ? 'border-b-4' : 'border-b'}`}
                >
                  {game.rowHints[rowIndex].map((hint, hintIndex) => (
                    <span key={hintIndex} className="text-sm font-bold">{hint}</span>
                  ))}
                </div>

                {/* Grid cells */}
                {row.map((cell, colIndex) => (
                  <button
                    key={colIndex}
                    className={`${getCellClassName(cell, rowIndex, colIndex)}
                              ${(colIndex + 1) % 5 === 0 ? 'border-r-4' : 'border-r'}
                              ${(rowIndex + 1) % 5 === 0 ? 'border-b-4' : 'border-b'}
                              border-black`}
                    onMouseDown={(e) => {
                      e.preventDefault(); // Prevent text selection
                      if (!isVictory && !showSolution) {
                        setIsMouseDown(true);
                        handleCellInteraction(rowIndex, colIndex, cell);
                      }
                    }}
                    onMouseEnter={() => {
                      if (isMouseDown && !isVictory && !showSolution) {
                        handleCellInteraction(rowIndex, colIndex, cell);
                      }
                    }}
                    disabled={isVictory || showSolution}
                  />
                ))}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      {/* Victory modal */}
      {isVictory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-xl shadow-lg text-center">
            <h2 className="text-2xl font-bold text-game-primary mb-4">
              Congratulations!
            </h2>
            <p className="text-lg text-gray-700 mb-6">
              You solved the puzzle in {formatTime(endTime! - startTime!)}
            </p>
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => useGameStore.setState({ game: null })}
                className="px-6 py-3 bg-game-secondary text-white rounded-lg hover:bg-game-secondary/90 transition-colors"
              >
                New Game
              </button>
              <button
                onClick={() => useGameStore.setState({ isVictory: false })}
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}; 