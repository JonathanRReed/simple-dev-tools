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
        oled: '#000000',
        midnight: '#0a0f29',
        deepPurple: '#260b41',
        neonPink: '#ff4dc4',
        neonBlue: '#3399ff',
        neonGold: '#ffd24d',
        neonPurple: '#9933ff',
        neonCyan: '#4dfff0',
        bodyText: '#E0E0E0',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
