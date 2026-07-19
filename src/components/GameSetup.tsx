import { useState, type ReactElement } from 'react'
import { useGameStore } from '../stores/gameStore'
import { SizeSelector } from './SizeSelector'
import { DifficultySelector } from './DifficultySelector'
import { PhotoUploader } from './PhotoUploader'

export const GameSetup = (): ReactElement => {
  const { gridSize, difficulty, generateNewGame } = useGameStore()
  const [seed, setSeed] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'random' | 'photo'>('random')

  const isSeedEntered = seed.length > 0

  const handleGenerate = () => {
    setIsGenerating(true)
    setError(null)
    try {
      generateNewGame(gridSize, difficulty, seed || undefined)
    } catch {
      setError('Could not load that seed. Check it and try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
        <h1 className="text-2xl font-bold text-game-primary mb-1">
          Infinigrams
        </h1>
        <p className="text-sm text-gray-500 mb-6">
          Endless nonogram puzzles — random or from your photos.
        </p>

        <div className="mb-6">
          <div className="flex gap-2 border-b">
            <button
              type="button"
              className={`px-4 py-2 ${
                activeTab === 'random'
                  ? 'border-b-2 border-game-secondary'
                  : ''
              }`}
              onClick={() => setActiveTab('random')}
            >
              Random Puzzle
            </button>
            <button
              type="button"
              className={`px-4 py-2 ${
                activeTab === 'photo'
                  ? 'border-b-2 border-game-secondary'
                  : ''
              }`}
              onClick={() => setActiveTab('photo')}
            >
              From Photo
            </button>
          </div>
        </div>

        {activeTab === 'random' ? (
          <div className="space-y-4">
            <section
              className={`space-y-2 ${
                isSeedEntered ? 'opacity-50 pointer-events-none' : ''
              }`}
            >
              <h2 className="text-lg font-semibold text-game-primary">
                Grid Size
              </h2>
              <SizeSelector
                currentSize={gridSize}
                onSizeChange={(size) =>
                  useGameStore.setState({ gridSize: size })
                }
              />
            </section>

            <section
              className={`space-y-2 ${
                isSeedEntered ? 'opacity-50 pointer-events-none' : ''
              }`}
            >
              <h2 className="text-lg font-semibold text-game-primary">
                Difficulty
              </h2>
              <DifficultySelector
                currentDifficulty={difficulty}
                onDifficultyChange={(diff) =>
                  useGameStore.setState({ difficulty: diff })
                }
              />
            </section>

            <input
              type="text"
              value={seed}
              onChange={(e) => setSeed(e.target.value)}
              placeholder="Enter seed (optional)"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />

            {error && <p className="text-sm text-game-accent">{error}</p>}

            <button
              type="button"
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full py-3 bg-game-secondary text-white rounded-lg
                       hover:bg-game-secondary/90 transition-colors disabled:opacity-50"
            >
              {isGenerating ? 'Generating...' : 'Generate Puzzle'}
            </button>
          </div>
        ) : (
          <PhotoUploader />
        )}
      </div>
    </div>
  )
}
