/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{html,ts}"],
  theme: {
    extend: {
      colors: {
        primary: '#6366F1',
        secondary: '#0E1731',
        background: '#F8FAFC',
        surface: '#FFFFFF',
        text: {
          primary: '#000626',
          secondary: '#00062680', // opcional (50%)
        },
        hover: '#4f51d4',

        gray: {
          50: '#F8FAFC',
          100: '#F1F5F9',
          200: '#E2E8F0',
          300: '#CBD5E1',
          400: '#94A3B8',
          500: '#64748B',
          700: '#334155',
          900: '#0F172A',
        },

        success: '#22C55E',
        warning: '#F59E0B',
        danger: '#EF4444',
        info: '#3B82F6',
      },

      keyframes: {
        fadeSlideIn: {
          '0%': { opacity: '0', transform: 'translateY(-6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },

      animation: {
        fadeSlideIn: 'fadeSlideIn 0.15s ease-out',
      },
    },
  },
  plugins: [],
};