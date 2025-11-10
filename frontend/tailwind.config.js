/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Anthropic brand colors
        primary: {
          50: '#fef6f3',
          100: '#fde9e1',
          200: '#fbd2c3',
          300: '#f7b099',
          400: '#f1875e',
          500: '#cc785c', // Main Anthropic coral
          600: '#b86547',
          700: '#9a503a',
          800: '#7d4332',
          900: '#67392c',
        },
        // Warm neutrals for backgrounds
        cream: {
          50: '#fdfcfb',
          100: '#faf8f5',
          200: '#f5f1eb',
          300: '#ebe5db',
          400: '#d9cfbd',
          500: '#c4b59f',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
