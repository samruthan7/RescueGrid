/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#0A0A0A',
        surface: {
          DEFAULT: '#141414',
          subtle: '#1C1C1C',
          hover: '#242424'
        },
        gold: {
          DEFAULT: '#D4AF37',
          light: '#F5DE88',
          dark: '#AA8820',
          muted: 'rgba(212, 175, 55, 0.25)',
          subtle: 'rgba(212, 175, 55, 0.12)'
        },
        severity: {
          low: '#22C55E', // Green
          medium: '#EAB308', // Yellow
          high: '#F97316', // Orange
          critical: '#EF4444' // Red
        },
        status: {
          reported: '#94A3B8', // Grey/Slate
          pending: '#EAB308', // Yellow
          inprogress: '#3B82F6', // Blue
          resolved: '#22C55E' // Green
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif']
      },
      animation: {
        'pulse-fast': 'pulse 1.4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2.5s ease-in-out infinite alternate',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(212, 175, 55, 0.2)' },
          '100%': { boxShadow: '0 0 20px rgba(212, 175, 55, 0.5)' },
        }
      }
    },
  },
  plugins: [],
};
