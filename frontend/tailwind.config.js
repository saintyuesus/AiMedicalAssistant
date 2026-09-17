/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // DeepSeek-inspired dark palette
        ink: {
          950: '#0b0e14',
          900: '#0f1218',
          850: '#141821',
          800: '#1a1f2b',
          750: '#1f2430',
          700: '#262c3a',
          600: '#323a4d',
          500: '#4a536b',
        },
        brand: {
          50: '#eafaf6',
          100: '#cff3eb',
          200: '#9fe7d7',
          300: '#62d4bd',
          400: '#2fbaa0',
          500: '#13a18a',
          600: '#0a826f',
          700: '#0a6859',
          800: '#0c5348',
          900: '#0d453c',
        },
        accent: {
          teal: '#13a18a',
          cyan: '#22d3ee',
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'PingFang SC',
          'Hiragino Sans GB',
          'Microsoft YaHei',
          'sans-serif',
        ],
      },
      boxShadow: {
        glow: '0 0 24px rgba(19, 161, 138, 0.25)',
        'soft': '0 4px 24px -8px rgba(0, 0, 0, 0.6)',
      },
      keyframes: {
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        },
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'pulse-ring': {
          '0%': { transform: 'scale(0.8)', opacity: '0.8' },
          '100%': { transform: 'scale(2)', opacity: '0' },
        },
      },
      animation: {
        blink: 'blink 1s step-end infinite',
        'fade-in': 'fade-in 0.25s ease-out',
        'pulse-ring': 'pulse-ring 1.4s cubic-bezier(0.215, 0.61, 0.355, 1) infinite',
      },
    },
  },
  plugins: [],
}
