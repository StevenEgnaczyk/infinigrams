import { type ReactElement, useEffect, useState } from 'react'
import { useGameStore } from './stores/gameStore'
import { GameSetup } from './components/GameSetup'
import { GameBoard } from './components/GameBoard'
import { formatTime } from './utils/timeUtils'

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
    startAutoSolve,
    resetToSetup,
  } = useGameStore()

  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!startTime || endTime) return

    const id = window.setInterval(() => setNow(Date.now()), 250)
    return () => window.clearInterval(id)
  }, [startTime, endTime])

  const elapsedMs = startTime
    ? (endTime ?? now) - startTime
    : 0

  return (
    <div className="min-h-screen bg-game-background">
      {!game ? (
        <GameSetup />
      ) : (
        <div className="h-screen flex flex-col">
          <header className="flex items-center justify-between gap-2 px-4 py-2 bg-white shadow-md">
            <button
              type="button"
              onClick={resetToSetup}
              className="px-4 py-2 text-game-primary hover:bg-gray-100 rounded-lg transition-colors"
            >
              ← Back
            </button>
            <div className="text-xl font-mono text-game-primary">
              {formatTime(elapsedMs)}
            </div>
            <div className="flex items-center gap-2 flex-wrap justify-end">
              {isAutoSolving && (
                <div className="flex items-center gap-2">
                  <label
                    htmlFor="solve-speed"
                    className="text-sm text-game-primary"
                  >
                    Speed:
                  </label>
                  <input
                    id="solve-speed"
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
                type="button"
                onClick={toggleShowSolution}
                className="px-4 py-2 text-game-accent hover:bg-gray-100 rounded-lg transition-colors"
              >
                {showSolution ? 'Hide Solution' : 'Reveal Solution'}
              </button>
              <button
                type="button"
                onClick={startAutoSolve}
                className="px-4 py-2 text-game-secondary hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
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
            />
          </main>
        </div>
      )}
    </div>
  )
}

export default App
