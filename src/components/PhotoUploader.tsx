import React, { useState, useEffect, useCallback } from 'react';
import { useGameStore } from '../stores/gameStore';
import { type ImageProcessingOptions } from '../types/gameTypes';
import { processImage } from '../utils/imageProcessor';
import debounce from 'lodash/debounce';

export const PhotoUploader: React.FC = () => {
  const [threshold, setThreshold] = useState(128);
  const [maxSize, setMaxSize] = useState({ rows: 15, columns: 15 });
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string>('');
  const [previewGrid, setPreviewGrid] = useState<boolean[][] | null>(null);
  const [generatedSeed, setGeneratedSeed] = useState<string | null>(null);
  const generateFromImage = useGameStore(state => state.generateFromImage);
  const generateSeedFromImage = useGameStore(state => state.generateSeedFromImage);

  // Debounced preview update
  const debouncedUpdatePreview = useCallback(
    debounce(async (image: File, options: ImageProcessingOptions) => {
      try {
        const grid = await processImage(image, options);
        setPreviewGrid(grid);
      } catch (error) {
        console.error('Failed to generate preview:', error);
      }
    }, 150),
    []
  );

  useEffect(() => {
    if (selectedImage) {
      const imageUrl = URL.createObjectURL(selectedImage);
      setImagePreviewUrl(imageUrl);
      
      const options: ImageProcessingOptions = { threshold, maxSize };
      debouncedUpdatePreview(selectedImage, options);

      return () => {
        URL.revokeObjectURL(imageUrl);
        debouncedUpdatePreview.cancel();
      };
    }
  }, [threshold, maxSize, selectedImage, debouncedUpdatePreview]);

  const handleThresholdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newThreshold = Number(e.target.value);
    setThreshold(newThreshold);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedImage(file);
  };

  const handleGenerate = async () => {
    if (!selectedImage) return;
    setIsGenerating(true);
    try {
      const options: ImageProcessingOptions = { threshold, maxSize };
      await generateFromImage(selectedImage, options);
    } catch (error) {
      console.error('Failed to process image:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateSeed = async () => {
    if (!selectedImage) return;
    try {
      const options: ImageProcessingOptions = { threshold, maxSize };
      const seed = await generateSeedFromImage(selectedImage, options);
      setGeneratedSeed(seed);
    } catch (error) {
      console.error('Failed to generate seed:', error);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="block text-sm font-medium text-game-primary">
          Threshold ({threshold})
        </label>
        <input
          type="range"
          min="0"
          max="255"
          value={threshold}
          onChange={handleThresholdChange}
          className="w-full"
        />
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-game-primary">
          Max Size
        </label>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="number"
            min="5"
            max="20"
            value={maxSize.rows}
            onChange={(e) => setMaxSize({ ...maxSize, rows: Number(e.target.value) })}
            className="w-full px-3 py-2 border rounded"
            placeholder="Rows"
          />
          <input
            type="number"
            min="5"
            max="20"
            value={maxSize.columns}
            onChange={(e) => setMaxSize({ ...maxSize, columns: Number(e.target.value) })}
            className="w-full px-3 py-2 border rounded"
            placeholder="Columns"
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

      {imagePreviewUrl && previewGrid && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="border border-gray-300 rounded p-4">
              <h3 className="text-sm font-medium text-game-primary mb-2">Original Image</h3>
              <div className="relative" style={{ aspectRatio: '1' }}>
                <img
                  src={imagePreviewUrl}
                  alt="Original"
                  className="absolute inset-0 w-full h-full object-contain"
                />
              </div>
            </div>

            <div className="border border-gray-300 rounded p-4">
              <h3 className="text-sm font-medium text-game-primary mb-2">Nonogram Grid</h3>
              <div className="grid gap-px bg-gray-200" 
                   style={{ 
                     gridTemplateColumns: `repeat(${previewGrid[0].length}, 1fr)`,
                     aspectRatio: '1'
                   }}>
                {previewGrid.map((row, i) =>
                  row.map((cell, j) => (
                    <div
                      key={`${i}-${j}`}
                      className={`${cell ? 'bg-black' : 'bg-white'}`}
                    />
                  ))
                )}
              </div>
            </div>
          </div>
          
          <div className="flex gap-4">
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="flex-1 py-3 bg-game-secondary text-white rounded-lg
                       hover:bg-game-secondary/90 transition-colors disabled:opacity-50"
            >
              {isGenerating ? 'Creating Puzzle...' : 'Create Puzzle'}
            </button>
            
            <button
              onClick={handleGenerateSeed}
              className="flex-1 py-3 bg-game-primary text-white rounded-lg
                       hover:bg-game-primary/90 transition-colors"
            >
              Generate Seed
            </button>
          </div>

          {generatedSeed && (
            <div className="mt-4 p-4 bg-gray-100 rounded-lg">
              <p className="text-sm font-medium text-game-primary mb-2">Generated Seed:</p>
              <code className="block p-2 bg-white rounded border select-all">
                {generatedSeed}
              </code>
            </div>
          )}
        </div>
      )}
    </div>
  );
}; 