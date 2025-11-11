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
          500: '#d97757', // Anthropic Orange
          600: '#cc785c',
          700: '#b86547',
          800: '#9a503a',
          900: '#7d4332',
        },
        // Warm neutrals for backgrounds
        cream: {
          50: '#fdfcfb',
          100: '#faf8f5',
          200: '#f5f1eb',
          300: '#ebe5db',
          400: '#e8e6dc', // Anthropic Light Gray
          500: '#d9cfbd',
          600: '#c4b59f',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
