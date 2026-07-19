import {
  Fragment,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactElement,
} from 'react';
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
  currentSeed,
}: GameBoardProps): ReactElement => {
  const [isPointerDown, setIsPointerDown] = useState(false);
  const [activeWave, setActiveWave] = useState<WaveCell[]>([]);
  const [copied, setCopied] = useState(false);
  const boardRef = useRef<HTMLDivElement>(null);
  const dragStateRef = useRef<boolean | 'x' | null>(null);
  const isZoomedOut = useGameStore((state) => state.isZoomedOut);
  const resetToSetup = useGameStore((state) => state.resetToSetup);

  const maxRowHintLength = Math.max(
    1,
    ...game.rowHints.map((hints) => hints.length)
  );
  const maxColHintLength = Math.max(
    1,
    ...game.columnHints.map((hints) => hints.length)
  );

  const calculateWaveCells = (currentDiagonal: number, size: number): WaveCell[] => {
    const cells: WaveCell[] = [];
    const maxIntensity = 0.8;
    const waveWidth = 4;

    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size; j++) {
        const distanceFromDiagonal = Math.abs(i + j - currentDiagonal);
        if (distanceFromDiagonal <= waveWidth) {
          const intensity =
            maxIntensity *
            Math.cos((distanceFromDiagonal / waveWidth) * Math.PI * 0.5);
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
    if (!(showSolution || isVictory || isZoomedOut) || !boardRef.current) return;

    const container = boardRef.current.querySelector('.overflow-auto');
    if (!container) return;

    container.scrollTo({
      left: (container.scrollWidth - container.clientWidth) / 2,
      top: (container.scrollHeight - container.clientHeight) / 2,
      behavior: 'smooth',
    });
  }, [showSolution, isVictory, isZoomedOut]);

  const nextStateFromCell = (cell: boolean | 'x'): boolean | 'x' => {
    if (cell === false) return true;
    if (cell === true) return 'x';
    return false;
  };

  const handleCellInteraction = (
    rowIndex: number,
    colIndex: number,
    initialCell: boolean | 'x',
    forcedState?: boolean | 'x'
  ) => {
    if (dragStateRef.current === null) {
      dragStateRef.current = forcedState ?? nextStateFromCell(initialCell);
    }

    onCellClick(rowIndex, colIndex, dragStateRef.current);
  };

  const getCellPresentation = (
    cell: boolean | 'x',
    rowIndex: number,
    colIndex: number
  ): { className: string; style?: CSSProperties } => {
    const isCorrectCell = game.solution[rowIndex][colIndex];
    const activeCell = activeWave.find(
      (waveCell) => waveCell.row === rowIndex && waveCell.col === colIndex
    );

    if ((isVictory || showSolution) && isCorrectCell) {
      const intensity = activeCell?.intensity ?? 0;
      const scale = 1 + intensity * 0.4;
      return {
        className: `w-8 h-8 wave-cell ${
          activeCell ? 'wave-active' : 'bg-yellow-600'
        }`,
        style: {
          ['--wave-scale' as string]: scale,
          ['--wave-opacity' as string]: intensity,
        },
      };
    }

    if (cell === 'x') {
      return {
        className: `w-8 h-8 bg-white relative before:absolute before:inset-0
              before:bg-[linear-gradient(45deg,transparent_45%,#666_45%,#666_55%,transparent_55%)]
              after:absolute after:inset-0
              after:bg-[linear-gradient(-45deg,transparent_45%,#666_45%,#666_55%,transparent_55%)]`,
      };
    }

    return {
      className: `w-8 h-8 ${cell ? 'bg-black' : 'bg-white'}`,
    };
  };

  const calculateScale = () => {
    const baseScale = 0.5;
    const gridSize = Math.max(game.solution.length, game.solution[0].length);

    if (gridSize >= 100) return baseScale * 0.2;
    if (gridSize >= 50) return baseScale * 0.35;
    if (gridSize >= 30) return baseScale * 0.35;
    if (gridSize >= 20) return baseScale * 0.45;
    if (gridSize >= 15) return baseScale * 0.7;
    return baseScale;
  };

  const copySeed = async () => {
    if (!currentSeed) return;
    try {
      await navigator.clipboard.writeText(currentSeed);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  const endPointer = () => {
    setIsPointerDown(false);
    dragStateRef.current = null;
  };

  return (
    <div
      ref={boardRef}
      className="w-full h-full flex flex-col items-center relative"
      onMouseUp={endPointer}
      onMouseLeave={endPointer}
      onTouchEnd={endPointer}
      onContextMenu={(e) => e.preventDefault()}
    >
      {currentSeed && (
        <div className="absolute top-2 right-4 z-10 flex items-center gap-2 text-sm">
          <span className="text-game-primary/70 hidden sm:inline">Seed</span>
          <button
            onClick={() => void copySeed()}
            className="px-3 py-1 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50"
            title={currentSeed}
          >
            {copied ? 'Copied!' : 'Copy seed'}
          </button>
        </div>
      )}

      <div className="w-full h-full overflow-auto">
        <div className="min-w-fit min-h-fit p-8 flex items-center justify-center">
          <div
            className="grid gap-0 border-4 border-black select-none touch-none"
            style={{
              gridTemplateColumns: `minmax(${maxRowHintLength}rem, auto) repeat(${game.userGrid[0].length}, 2rem)`,
              gridTemplateRows: `minmax(${maxColHintLength}rem, auto) repeat(${game.userGrid.length}, 2rem)`,
              transform:
                isVictory || showSolution || isZoomedOut
                  ? `scale(${calculateScale()})`
                  : 'none',
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
              <Fragment key={rowIndex}>
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
                  const presentation = getCellPresentation(
                    cell,
                    rowIndex,
                    colIndex
                  );
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
                      if (isVictory || showSolution) return;
                      setIsPointerDown(true);
                      if (e.button === 2) {
                        handleCellInteraction(rowIndex, colIndex, cell, 'x');
                      } else {
                        handleCellInteraction(rowIndex, colIndex, cell);
                      }
                    }}
                    onMouseEnter={() => {
                      if (isPointerDown && !isVictory && !showSolution) {
                        handleCellInteraction(rowIndex, colIndex, cell);
                      }
                    }}
                    onTouchStart={(e) => {
                      e.preventDefault();
                      if (isVictory || showSolution) return;
                      setIsPointerDown(true);
                      handleCellInteraction(rowIndex, colIndex, cell);
                    }}
                    onTouchMove={(e) => {
                      if (!isPointerDown || isVictory || showSolution) return;
                      const touch = e.touches[0];
                      const el = document.elementFromPoint(
                        touch.clientX,
                        touch.clientY
                      );
                      if (!(el instanceof HTMLElement)) return;
                      const rowAttr = el.getAttribute('data-row');
                      const colAttr = el.getAttribute('data-col');
                      if (rowAttr == null || colAttr == null) return;
                      const r = Number(rowAttr);
                      const c = Number(colAttr);
                      handleCellInteraction(r, c, game.userGrid[r][c]);
                    }}
                    data-row={rowIndex}
                    data-col={colIndex}
                    disabled={isVictory || !!showSolution}
                  />
                  );
                })}
              </Fragment>
            ))}
          </div>
        </div>
      </div>

      {isVictory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-8 rounded-xl shadow-lg text-center max-w-sm w-full">
            <h2 className="text-2xl font-bold text-game-primary mb-4">
              Congratulations!
            </h2>
            <p className="text-lg text-gray-700 mb-6">
              You solved the puzzle in{' '}
              {formatTime((endTime ?? 0) - (startTime ?? 0))}
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
