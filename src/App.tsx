import { type ReactElement } from 'react';
import { useGameStore } from './stores/gameStore';
import { GameSetup } from './components/GameSetup';
import { GameBoard } from './components/GameBoard';
import { formatTime } from './utils/timeUtils';
import React from 'react';

const App = (): ReactElement => {
  const { 
    game,
    isVictory,
    showSolution,
    startTime,
    endTime,
    toggleCell,
    toggleShowSolution,
    solveSpeed,
    setSolveSpeed,
    isAutoSolving,
    currentSeed
  } = useGameStore(state => state);

  return (
    <div className="min-h-screen bg-game-background">
      {!game ? (
        <GameSetup />
      ) : (
        <div className="h-screen flex flex-col">
          <header className="flex items-center justify-between px-4 py-2 bg-white shadow-md">
            <button 
              onClick={() => useGameStore.setState({ game: null })}
              className="px-4 py-2 text-game-primary hover:bg-gray-100 rounded-lg transition-colors"
            >
              ← Back
            </button>
            <div className="text-xl font-mono text-game-primary">
              {startTime ? formatTime(endTime ? endTime - startTime : Date.now() - startTime) : '00:00'}
            </div>
            <div className="flex items-center gap-2">
              {isAutoSolving && (
                <div className="flex items-center gap-2">
                  <label className="text-sm text-game-primary">Speed:</label>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    value={solveSpeed}
                    onChange={(e) => setSolveSpeed(Number(e.target.value))}
                    className="w-24"
                  />
                </div>
              )}
              <button
                onClick={toggleShowSolution}
                className="px-4 py-2 text-game-accent hover:bg-gray-100 rounded-lg transition-colors"
              >
                {showSolution ? 'Hide Solution' : 'Reveal Solution'}
              </button>
              <button
                onClick={() => useGameStore.getState().startAutoSolve()}
                className="px-4 py-2 text-game-secondary hover:bg-gray-100 rounded-lg transition-colors"
                disabled={showSolution || isVictory}
              >
                {isAutoSolving ? 'Stop Solving' : 'Auto Solve'}
              </button>
            </div>
          </header>
          
          <main className="flex-1 relative overflow-hidden pt-8">
            <GameBoard 
              game={game}
              onCellClick={toggleCell}
              isVictory={isVictory}
              showSolution={showSolution}
              startTime={startTime}
              endTime={endTime}
              currentSeed={currentSeed}
            />
          </main>
        </div>
      )}
    </div>
  );
};

export default App; 