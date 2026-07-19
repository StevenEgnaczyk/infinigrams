import { type ReactElement } from 'react';
import { Difficulty } from '../types/gameTypes';

interface DifficultySelectorProps {
  currentDifficulty: Difficulty;
  onDifficultyChange: (difficulty: Difficulty) => void;
}

export const DifficultySelector = ({
  currentDifficulty,
  onDifficultyChange,
}: DifficultySelectorProps): ReactElement => {
  const difficulties: Exclude<Difficulty, 'custom'>[] = [
    'easy',
    'medium',
    'hard',
  ];

  return (
    <div className="flex gap-3">
      {difficulties.map((difficulty) => (
        <button
          key={difficulty}
          type="button"
          onClick={() => onDifficultyChange(difficulty)}
          className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all transform hover:scale-105
            ${
              currentDifficulty === difficulty
                ? 'bg-game-secondary text-white shadow-lg'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
        >
          {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
        </button>
      ))}
    </div>
  );
};
