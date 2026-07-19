import { type ReactElement, type ChangeEvent } from 'react'
import { GridSize } from '../types/gameTypes'

interface SizeSelectorProps {
  currentSize: GridSize
  onSizeChange: (size: GridSize) => void
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value))

export const SizeSelector = ({
  currentSize,
  onSizeChange,
}: SizeSelectorProps): ReactElement => {
  const handleChange =
    (key: keyof GridSize) => (e: ChangeEvent<HTMLInputElement>) => {
      const parsed = parseInt(e.target.value, 10)
      if (Number.isNaN(parsed)) return
      onSizeChange({
        ...currentSize,
        [key]: clamp(parsed, 5, 20),
      })
    }

  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2">
        <label
          htmlFor="rows"
          className="block text-sm font-medium text-game-primary"
        >
          Rows
        </label>
        <input
          type="number"
          id="rows"
          min={5}
          max={20}
          value={currentSize.rows}
          onChange={handleChange('rows')}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm 
                   focus:outline-none focus:ring-2 focus:ring-game-secondary focus:border-transparent"
        />
      </div>
      <div className="space-y-2">
        <label
          htmlFor="columns"
          className="block text-sm font-medium text-game-primary"
        >
          Columns
        </label>
        <input
          type="number"
          id="columns"
          min={5}
          max={20}
          value={currentSize.columns}
          onChange={handleChange('columns')}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm 
                   focus:outline-none focus:ring-2 focus:ring-game-secondary focus:border-transparent"
        />
      </div>
    </div>
  )
}
