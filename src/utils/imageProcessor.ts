import { GridSize, ImageProcessingOptions } from '../types/gameTypes';

export const processImage = async (
  image: File,
  options: ImageProcessingOptions
): Promise<boolean[][]> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();

    reader.onload = () => {
      img.onload = () => {
        try {
          const grid = convertImageToGrid(img, options);
          resolve(grid);
        } catch (error) {
          reject(error);
        }
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = reader.result as string;
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(image);
  });
};

const convertImageToGrid = (
  img: HTMLImageElement,
  { threshold, maxSize }: ImageProcessingOptions
): boolean[][] => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Failed to get canvas context');

  // Calculate scaled dimensions while maintaining aspect ratio
  const scale = Math.min(
    maxSize.columns / img.width,
    maxSize.rows / img.height
  );
  const width = Math.round(img.width * scale);
  const height = Math.round(img.height * scale);

  canvas.width = width;
  canvas.height = height;

  // Use better image rendering
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  
  // Draw and process image
  ctx.drawImage(img, 0, 0, width, height);
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  const grid: boolean[][] = Array(height);
  
  // Pre-calculate row arrays for better performance
  for (let y = 0; y < height; y++) {
    grid[y] = new Array(width);
    const row = grid[y];
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      // Convert to grayscale and compare with threshold
      const gray = (
        data[i] * 0.299 +
        data[i + 1] * 0.587 +
        data[i + 2] * 0.114
      );
      row[x] = gray < threshold;
    }
  }

  return grid;
}; 