/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'royal-purple': '#a855f7',
        'royal-purple-light': '#e9d5ff',
        'geek-dark': 'rgba(10, 10, 15, 0.9)',
      },
      borderRadius: {
        'royal': '20px',
        'item': '14px',
      },
      backdropBlur: {
        'royal': '40px',
      }
    },
  },
  plugins: [],
}
