import { type ReactElement } from 'react';
import { GridSize } from '../types/gameTypes';

interface SizeSelectorProps {
  currentSize: GridSize;
  onSizeChange: (size: GridSize) => void;
}

const clampSize = (value: string, fallback: number): number => {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) return fallback;
  return Math.min(20, Math.max(5, parsed));
};

export const SizeSelector = ({ currentSize, onSizeChange }: SizeSelectorProps): ReactElement => {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2">
        <label htmlFor="rows" className="block text-sm font-medium text-game-primary">
          Rows
        </label>
        <input
          type="number"
          id="rows"
          min={5}
          max={20}
          value={currentSize.rows}
          onChange={(e) =>
            onSizeChange({ ...currentSize, rows: clampSize(e.target.value, currentSize.rows) })
          }
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm
                   focus:outline-none focus:ring-2 focus:ring-game-secondary focus:border-transparent"
        />
      </div>
      <div className="space-y-2">
        <label htmlFor="columns" className="block text-sm font-medium text-game-primary">
          Columns
        </label>
        <input
          type="number"
          id="columns"
          min={5}
          max={20}
          value={currentSize.columns}
          onChange={(e) =>
            onSizeChange({
              ...currentSize,
              columns: clampSize(e.target.value, currentSize.columns),
            })
          }
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm
                   focus:outline-none focus:ring-2 focus:ring-game-secondary focus:border-transparent"
        />
      </div>
    </div>
  );
};
