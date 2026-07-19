# Infinigrams

A React-based Nonogram (Picross / Paint by Numbers) game. Generate random puzzles or turn your own photos into playable grids.

## Features

- Grid sizes from 5×5 to 20×20
- Easy / Medium / Hard random puzzles
- Photo-to-puzzle conversion with live preview
- Seed-based sharing (including image-derived seeds)
- Drag-to-fill / drag-to-mark-X controls
- Auto-solve assistant and victory wave animation
- Live timer

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Installation

```bash
git clone https://github.com/stevenegnaczyk/infinigrams.git
cd infinigrams
npm install
```

### Development

```bash
npm run dev
```

### Production build

```bash
npm run build
npm run preview
```

### Deploy to GitHub Pages

```bash
npm run deploy
```

## How to Play

1. Choose a grid size and difficulty, or upload a photo
2. Fill cells using the row and column number clues
3. Controls:
   - Left click / drag to fill (then mark X, then clear)
   - Right click / drag to mark empty cells with X
   - Touch and drag works the same on mobile
4. Complete the picture to win

## Project Structure

```
src/
├── components/       # UI components
├── stores/           # Zustand game state
├── types/            # Shared TypeScript types
└── utils/            # Puzzle generation, solver, image/seed helpers
```

## Tech Stack

- React 18
- TypeScript
- Vite
- Tailwind CSS
- Zustand
- SeedRandom
