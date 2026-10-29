/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          950: '#080D18',
          900: '#0F1726',
          800: '#141F30',
          700: '#1a2840',
          600: '#253247',
        },
        charcoal: {
          900: '#0F1726',
          800: '#141F30',
          700: '#1a2840',
        },
        ev: {
          green:    '#00E5A0',
          'green-dim': '#00b87f',
          cyan:     '#38BDF8',
          blue:     '#38BDF8',
          amber:    '#f59e0b',
          red:      '#ef4444',
        },
        // Legacy aliases for backward compat
        electric: {
          DEFAULT: '#00E5A0',
          dim:     '#00b87f',
          glow:    '#00E5A0',
        },
      },
      fontFamily: {
        sans:    ['Inter', 'system-ui', 'sans-serif'],
        display: ['Outfit', 'Inter', 'sans-serif'],
      },
      backgroundImage: {
        'ev-gradient':   'linear-gradient(135deg, #080D18 0%, #0F1726 50%, #141F30 100%)',
        'card-gradient': 'linear-gradient(135deg, rgba(20,31,48,0.95) 0%, rgba(8,13,24,0.95) 100%)',
        'green-gradient':'linear-gradient(135deg, #00E5A0 0%, #00b87f 100%)',
        'hero-gradient': 'radial-gradient(ellipse at 50% 50%, rgba(0,229,160,0.06) 0%, transparent 70%)',
      },
      boxShadow: {
        'ev':        '0 0 20px rgba(0,229,160,0.12)',
        'ev-lg':     '0 0 40px rgba(0,229,160,0.18)',
        'card':      '0 4px 24px rgba(0,0,0,0.5)',
        'card-hover':'0 8px 40px rgba(0,229,160,0.12)',
      },
      animation: {
        'pulse-green': 'pulse-green 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in':     'fade-in 0.3s ease-out',
        'slide-up':    'slide-up 0.4s ease-out',
        'float':       'float 3s ease-in-out infinite',
      },
      keyframes: {
        'pulse-green': {
          '0%, 100%': { opacity: 1 },
          '50%':       { opacity: 0.5 },
        },
        'fade-in': {
          '0%':   { opacity: 0, transform: 'translateY(8px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
        'slide-up': {
          '0%':   { opacity: 0, transform: 'translateY(20px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':      { transform: 'translateY(-8px)' },
        },
      },
    },
  },
  plugins: [],
}
