import type { Config } from 'tailwindcss'

export default {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f5f7ff',
          100: '#eaeefe',
          200: '#cfd8fd',
          300: '#a7b6fb',
          400: '#7688f8',
          500: '#4f5ff5',
          600: '#3541e9',
          700: '#2a34c5',
          800: '#232ca0',
          900: '#1f2782',
        },
      },
    },
  },
  plugins: [],
} satisfies Config
