import { type ReactElement } from 'react';
import React from 'react';
import { GridSize } from '../types/gameTypes';

interface SizeSelectorProps {
  currentSize: GridSize;
  onSizeChange: (size: GridSize) => void;
}

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
          onChange={(e) => onSizeChange({ ...currentSize, rows: parseInt(e.target.value) })}
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
          onChange={(e) => onSizeChange({ ...currentSize, columns: parseInt(e.target.value) })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm 
                   focus:outline-none focus:ring-2 focus:ring-game-secondary focus:border-transparent"
        />
      </div>
    </div>
  );
}; 