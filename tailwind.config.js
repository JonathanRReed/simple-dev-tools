/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx}',
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    './app/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Rosé Pine tokens via CSS variables
        rp: {
          base: 'var(--rp-base)',
          surface: 'var(--rp-surface)',
          overlay: 'var(--rp-overlay)',
          muted: 'var(--rp-muted)',
          subtle: 'var(--rp-subtle)',
          text: 'var(--rp-text)',
          love: 'var(--rp-love)',
          gold: 'var(--rp-gold)',
          rose: 'var(--rp-rose)',
          pine: 'var(--rp-pine)',
          foam: 'var(--rp-foam)',
          iris: 'var(--rp-iris)',
          highlight: {
            low: 'var(--rp-highlight-low)',
            med: 'var(--rp-highlight-med)',
            high: 'var(--rp-highlight-high)'
          }
        }
      },
      fontFamily: {
        sans: ['Nebula Sans', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
