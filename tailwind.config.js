/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'game-primary': '#2C3E50',
        'game-secondary': '#3498DB',
        'game-accent': '#E74C3C',
        'game-background': '#ECF0F1',
        'game-surface': '#FFFFFF',
      },
      keyframes: {
        wave: {
          '0%': {
            transform: 'scale(1)',
            backgroundColor: '#fbbf24',
            boxShadow: '0 0 5px #fbbf24',
          },
          '50%': {
            transform: 'scale(1.5)',
            backgroundColor: '#f59e0b',
            boxShadow: '0 0 30px #f59e0b',
          },
          '100%': {
            transform: 'scale(1)',
            backgroundColor: '#fbbf24',
            boxShadow: '0 0 5px #fbbf24',
          },
        },
      },
      animation: {
        wave: 'wave 4s linear infinite',
      },
    },
  },
  plugins: [],
}
