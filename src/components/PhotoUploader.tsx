import { useState, useEffect, useMemo, type ReactElement, type ChangeEvent } from 'react'
import { useGameStore } from '../stores/gameStore'
import { type ImageProcessingOptions } from '../types/gameTypes'
import { processImage } from '../utils/imageProcessor'
import { debounce } from '../utils/debounce'

export const PhotoUploader = (): ReactElement => {
  const [threshold, setThreshold] = useState(128)
  const [maxSize, setMaxSize] = useState({ rows: 15, columns: 15 })
  const [isGenerating, setIsGenerating] = useState(false)
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imagePreviewUrl, setImagePreviewUrl] = useState('')
  const [previewGrid, setPreviewGrid] = useState<boolean[][] | null>(null)
  const [generatedSeed, setGeneratedSeed] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const generateFromImage = useGameStore((state) => state.generateFromImage)
  const generateSeedFromImage = useGameStore(
    (state) => state.generateSeedFromImage
  )

  const debouncedUpdatePreview = useMemo(
    () =>
      debounce(async (image: File, options: ImageProcessingOptions) => {
        try {
          const grid = await processImage(image, options)
          setPreviewGrid(grid)
          setError(null)
        } catch (err) {
          console.error('Failed to generate preview:', err)
          setError('Failed to process that image.')
        }
      }, 150),
    []
  )

  useEffect(() => {
    if (!selectedImage) return

    const imageUrl = URL.createObjectURL(selectedImage)
    setImagePreviewUrl(imageUrl)

    const options: ImageProcessingOptions = { threshold, maxSize }
    debouncedUpdatePreview(selectedImage, options)

    return () => {
      URL.revokeObjectURL(imageUrl)
      debouncedUpdatePreview.cancel()
    }
  }, [threshold, maxSize, selectedImage, debouncedUpdatePreview])

  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setSelectedImage(file)
    setGeneratedSeed(null)
    setPreviewGrid(null)
  }

  const handleGenerate = async () => {
    if (!selectedImage) return
    setIsGenerating(true)
    setError(null)
    try {
      await generateFromImage(selectedImage, { threshold, maxSize })
    } catch (err) {
      console.error('Failed to process image:', err)
      setError('Failed to create puzzle from that image.')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleGenerateSeed = async () => {
    if (!selectedImage) return
    setError(null)
    try {
      const seed = await generateSeedFromImage(selectedImage, {
        threshold,
        maxSize,
      })
      setGeneratedSeed(seed)
    } catch (err) {
      console.error('Failed to generate seed:', err)
      setError('Failed to generate a seed for that image.')
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label
          htmlFor="threshold"
          className="block text-sm font-medium text-game-primary"
        >
          Threshold ({threshold})
        </label>
        <input
          id="threshold"
          type="range"
          min="0"
          max="255"
          value={threshold}
          onChange={(e) => setThreshold(Number(e.target.value))}
          className="w-full"
        />
      </div>

      <div className="space-y-2">
        <span className="block text-sm font-medium text-game-primary">
          Max Size
        </span>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="number"
            min="5"
            max="20"
            value={maxSize.rows}
            onChange={(e) =>
              setMaxSize({ ...maxSize, rows: Number(e.target.value) })
            }
            className="w-full px-3 py-2 border rounded"
            placeholder="Rows"
            aria-label="Max rows"
          />
          <input
            type="number"
            min="5"
            max="20"
            value={maxSize.columns}
            onChange={(e) =>
              setMaxSize({ ...maxSize, columns: Number(e.target.value) })
            }
            className="w-full px-3 py-2 border rounded"
            placeholder="Columns"
            aria-label="Max columns"
          />
        </div>
      </div>

      <input
        type="file"
        accept="image/*"
        onChange={handleImageUpload}
        className="block w-full text-sm text-gray-500
                 file:mr-4 file:py-2 file:px-4
                 file:rounded-full file:border-0
                 file:text-sm file:font-semibold
                 file:bg-game-secondary file:text-white
                 hover:file:bg-game-secondary/90"
      />

      {error && <p className="text-sm text-game-accent">{error}</p>}

      {imagePreviewUrl && previewGrid && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="border border-gray-300 rounded p-4">
              <h3 className="text-sm font-medium text-game-primary mb-2">
                Original Image
              </h3>
              <div className="relative" style={{ aspectRatio: '1' }}>
                <img
                  src={imagePreviewUrl}
                  alt="Original"
                  className="absolute inset-0 w-full h-full object-contain"
                />
              </div>
            </div>

            <div className="border border-gray-300 rounded p-4">
              <h3 className="text-sm font-medium text-game-primary mb-2">
                Nonogram Grid
              </h3>
              <div
                className="grid gap-px bg-gray-200"
                style={{
                  gridTemplateColumns: `repeat(${previewGrid[0].length}, 1fr)`,
                  aspectRatio: '1',
                }}
              >
                {previewGrid.map((row, i) =>
                  row.map((cell, j) => (
                    <div
                      key={`${i}-${j}`}
                      className={cell ? 'bg-black' : 'bg-white'}
                    />
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            <button
              type="button"
              onClick={handleGenerate}
              disabled={isGenerating}
              className="flex-1 py-3 bg-game-secondary text-white rounded-lg
                       hover:bg-game-secondary/90 transition-colors disabled:opacity-50"
            >
              {isGenerating ? 'Creating Puzzle...' : 'Create Puzzle'}
            </button>

            <button
              type="button"
              onClick={handleGenerateSeed}
              className="flex-1 py-3 bg-game-primary text-white rounded-lg
                       hover:bg-game-primary/90 transition-colors"
            >
              Generate Seed
            </button>
          </div>

          {generatedSeed && (
            <div className="mt-4 p-4 bg-gray-100 rounded-lg">
              <p className="text-sm font-medium text-game-primary mb-2">
                Generated Seed:
              </p>
              <code className="block p-2 bg-white rounded border select-all break-all">
                {generatedSeed}
              </code>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
