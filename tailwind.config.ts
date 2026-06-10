import type { Config } from 'tailwindcss'

export default <Config>{
  content: [
    './components/**/*.{js,vue,ts}',
    './layouts/**/*.vue',
    './pages/**/*.vue',
    './plugins/**/*.{js,ts}',
    './app.vue',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          dark: '#0c0c13',
          gold: '#f0b429',
          white: '#ffffff',
        },
        surface: {
          dark: '#14141e',
          card: 'rgba(255,255,255,0.05)',
          'card-border': 'rgba(255,255,255,0.09)',
          input: '#f4f4f8',
          divider: '#ebebf0',
        },
        text: {
          'on-dark': '#ffffff',
          'muted-dark': 'rgba(255,255,255,0.45)',
          'on-light': '#0c0c13',
          'muted-light': '#999999',
        },
        success: '#1a9e6a',
        warning: '#e5990a',
        error: '#d93025',
        info: '#2563eb',
        gold: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          400: '#f0b429',
          600: '#d97706',
          800: '#92400e',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      borderRadius: {
        card: '20px',
        btn: '14px',
        input: '12px',
      },
      animation: {
        'pulse-brand': 'pulse 2s ease-in-out infinite',
      },
      keyframes: {
        pulse: {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.5', transform: 'scale(1.3)' },
        },
      },
    },
  },
  plugins: [],
}
