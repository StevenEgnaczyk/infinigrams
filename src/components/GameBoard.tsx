import { type ReactElement, useEffect, useRef, useState } from 'react';
import React from 'react';
import { NonogramGame } from '../types/gameTypes';
import { useGameStore } from '../stores/gameStore';
import { formatTime } from '../utils/timeUtils';

interface GameBoardProps {
  game: NonogramGame;
  onCellClick: (row: number, col: number, nextState?: boolean | 'x') => void;
  isVictory: boolean;
  showSolution?: boolean;
  startTime: number | null;
  endTime: number | null;
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
}: GameBoardProps): ReactElement => {
  const isAutoSolving = useGameStore((state) => state.isAutoSolving);
  const resetToSetup = useGameStore((state) => state.resetToSetup);

  const [isMouseDown, setIsMouseDown] = useState(false);
  const [activeWave, setActiveWave] = useState<WaveCell[]>([]);
  const dragStateRef = useRef<boolean | 'x' | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);

  const maxRowHintLength = Math.max(1, ...game.rowHints.map((hints) => hints.length));
  const maxColHintLength = Math.max(1, ...game.columnHints.map((hints) => hints.length));
  const shouldScale = isVictory || showSolution || isAutoSolving;

  const calculateWaveCells = (currentDiagonal: number, size: number): WaveCell[] => {
    const cells: WaveCell[] = [];
    const maxIntensity = 0.8;
    const waveWidth = 4;

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

  useEffect(() => {
    if (!isVictory && !showSolution) return;

    const size = game.solution.length;
    if (size >= 50) return;

    let currentDiagonal = 0;
    const totalDiagonals = 2 * size - 1;

    const waveInterval = window.setInterval(() => {
      setActiveWave(calculateWaveCells(currentDiagonal, size));
      currentDiagonal = (currentDiagonal + 1) % (totalDiagonals + 5);
    }, 100);

    return () => window.clearInterval(waveInterval);
  }, [isVictory, showSolution, game.solution]);

  useEffect(() => {
    if (!shouldScale || !boardRef.current) return;

    const container = boardRef.current.querySelector('.overflow-auto');
    if (!container) return;

    container.scrollTo({
      left: (container.scrollWidth - container.clientWidth) / 2,
      top: (container.scrollHeight - container.clientHeight) / 2,
      behavior: 'smooth',
    });
  }, [shouldScale, game.solution.length]);

  const endDrag = () => {
    setIsMouseDown(false);
    dragStateRef.current = null;
  };

  const paintCell = (rowIndex: number, colIndex: number, nextState: boolean | 'x') => {
    onCellClick(rowIndex, colIndex, nextState);
  };

  const beginLeftDrag = (rowIndex: number, colIndex: number, initialCell: boolean | 'x') => {
    const nextState =
      initialCell === false ? true : initialCell === true ? 'x' : false;
    dragStateRef.current = nextState;
    setIsMouseDown(true);
    paintCell(rowIndex, colIndex, nextState);
  };

  const beginRightDrag = (rowIndex: number, colIndex: number, initialCell: boolean | 'x') => {
    const nextState = initialCell === 'x' ? false : 'x';
    dragStateRef.current = nextState;
    setIsMouseDown(true);
    paintCell(rowIndex, colIndex, nextState);
  };

  const continueDrag = (rowIndex: number, colIndex: number) => {
    if (!isMouseDown || dragStateRef.current === null) return;
    paintCell(rowIndex, colIndex, dragStateRef.current);
  };

  const getCellPresentation = (cell: boolean | 'x', rowIndex: number, colIndex: number) => {
    const isCorrectCell = game.solution[rowIndex][colIndex];
    const activeCell = activeWave.find((waveCell) => waveCell.row === rowIndex && waveCell.col === colIndex);

    if ((isVictory || showSolution) && isCorrectCell) {
      const intensity = activeCell?.intensity ?? 0;
      const scale = 1 + intensity * 0.4;
      return {
        className: `w-8 h-8 wave-cell ${activeCell ? 'wave-active' : 'bg-yellow-600'}`,
        style: {
          ['--wave-scale' as string]: String(scale),
          ['--wave-opacity' as string]: String(intensity),
        } as React.CSSProperties,
      };
    }

    if (cell === 'x') {
      return {
        className: `w-8 h-8 bg-white relative before:absolute before:inset-0
              before:bg-[linear-gradient(45deg,transparent_45%,#666_45%,#666_55%,transparent_55%)]
              after:absolute after:inset-0
              after:bg-[linear-gradient(-45deg,transparent_45%,#666_45%,#666_55%,transparent_55%)]`,
        style: undefined,
      };
    }

    return {
      className: `w-8 h-8 ${cell ? 'bg-black' : 'bg-white'}`,
      style: undefined,
    };
  };

  const calculateScale = () => {
    const baseScale = 0.5;
    const gridSize = game.solution.length;

    if (gridSize >= 100) return baseScale * 0.2;
    if (gridSize >= 50) return baseScale * 0.35;
    if (gridSize >= 30) return baseScale * 0.35;
    if (gridSize >= 20) return baseScale * 0.45;
    if (gridSize >= 15) return baseScale * 0.7;
    return baseScale;
  };

  const interactionLocked = isVictory || !!showSolution;

  return (
    <div
      ref={boardRef}
      className="w-full h-full flex flex-col items-center relative"
      onMouseUp={endDrag}
      onMouseLeave={endDrag}
    >
      <div className="w-full h-full overflow-auto">
        <div className="min-w-fit min-h-fit p-8 flex items-center justify-center">
          <div
            className="grid gap-0 border-4 border-black"
            style={{
              gridTemplateColumns: `minmax(${maxRowHintLength}rem, auto) repeat(${game.userGrid[0].length}, 2rem)`,
              gridTemplateRows: `minmax(${maxColHintLength}rem, auto) repeat(${game.userGrid.length}, 2rem)`,
              transform: shouldScale ? `scale(${calculateScale()})` : 'none',
              transformOrigin: 'center',
              transition: 'transform 0.5s ease-in-out',
            }}
          >
            <div className="bg-gray-200 border-r-4 border-b-4 border-black" />

            {game.columnHints.map((hints, colIndex) => (
              <div
                key={colIndex}
                className={`bg-gray-200 flex flex-col items-center justify-end pb-1 border-b-4 border-black
                           ${(colIndex + 1) % 5 === 0 ? 'border-r-4' : 'border-r'}`}
              >
                {hints.map((hint, hintIndex) => (
                  <span key={hintIndex} className="text-sm font-bold">
                    {hint}
                  </span>
                ))}
              </div>
            ))}

            {game.userGrid.map((row, rowIndex) => (
              <React.Fragment key={rowIndex}>
                <div
                  className={`bg-gray-200 flex items-center justify-end gap-1 pr-2 border-r-4 border-black
                             ${(rowIndex + 1) % 5 === 0 ? 'border-b-4' : 'border-b'}`}
                >
                  {game.rowHints[rowIndex].map((hint, hintIndex) => (
                    <span key={hintIndex} className="text-sm font-bold">
                      {hint}
                    </span>
                  ))}
                </div>

                {row.map((cell, colIndex) => {
                  const presentation = getCellPresentation(cell, rowIndex, colIndex);
                  return (
                  <button
                    key={colIndex}
                    type="button"
                    aria-label={`Cell ${rowIndex + 1}, ${colIndex + 1}`}
                    className={`${presentation.className}
                              ${(colIndex + 1) % 5 === 0 ? 'border-r-4' : 'border-r'}
                              ${(rowIndex + 1) % 5 === 0 ? 'border-b-4' : 'border-b'}
                              border-black`}
                    style={presentation.style}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      if (interactionLocked) return;
                      if (e.button === 2) {
                        beginRightDrag(rowIndex, colIndex, cell);
                        return;
                      }
                      beginLeftDrag(rowIndex, colIndex, cell);
                    }}
                    onMouseEnter={() => {
                      if (!interactionLocked) continueDrag(rowIndex, colIndex);
                    }}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      if (interactionLocked) return;
                      beginRightDrag(rowIndex, colIndex, cell);
                    }}
                    disabled={interactionLocked}
                  />
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      {isVictory && startTime && endTime && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-xl shadow-lg text-center">
            <h2 className="text-2xl font-bold text-game-primary mb-4">Congratulations!</h2>
            <p className="text-lg text-gray-700 mb-6">
              You solved the puzzle in {formatTime(endTime - startTime)}
            </p>
            <div className="flex gap-4 justify-center">
              <button
                onClick={resetToSetup}
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
