/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        arc: {
          cyan: '#00f2fe',
          blue: '#4facfe',
          purple: '#8b5cf6',
          violet: '#6366f1',
          dark: '#080a10',
          card: '#0f1422',
        }
      },
      fontFamily: {
        orbitron: ['Orbitron', 'sans-serif'],
        mono: ['Fira Code', 'monospace'],
        sans: ['Rajdhani', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
