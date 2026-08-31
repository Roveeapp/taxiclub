import type { Config } from 'tailwindcss'

export default <Config>{
  content: [
    './app/components/**/*.{js,vue,ts}',
    './app/layouts/**/*.vue',
    './app/pages/**/*.vue',
    './app/plugins/**/*.{js,ts}',
    './app/app.vue',
  ],
  theme: {
    extend: {
      colors: {
        // `gold` es el acento de marca. Había además un token `gold-accent`
        // con #f0b429 que no usaba nadie y competía por el mismo nombre.
        brand: { dark: '#0c0c13', gold: '#fabd32', white: '#ffffff' },
        surface: {
          DEFAULT: '#12121c',
          dim: '#12121c',
          bright: '#393843',
          'container-lowest': '#0d0d17',
          'container-low': '#1b1b25',
          'container': '#1f1f29',
          'container-high': '#292934',
          'container-highest': '#34343f',
          dark: '#14141e',
          card: 'rgba(255,255,255,0.05)',
          'card-border': 'rgba(255,255,255,0.09)',
          input: '#f4f4f8',
          divider: '#ebebf0',
        },
        on: {
          surface: '#e4e1ef',
          'surface-variant': '#c8c5cb',
          primary: '#303038',
          'primary-container': '#7b7983',
          secondary: '#412d00',
          'secondary-container': '#4c3500',
          tertiary: '#2f3131',
          'tertiary-container': '#797b7b',
          background: '#e4e1ef',
          error: '#690005',
          'error-container': '#ffdad6',
        },
        primary: {
          DEFAULT: '#c8c5cf',
          container: '#0c0c13',
          fixed: '#e4e1ec',
          'fixed-dim': '#c8c5cf',
          inverse: '#5e5d66',
        },
        secondary: {
          DEFAULT: '#fabd32',
          container: '#d29a00',
          fixed: '#ffdea4',
          'fixed-dim': '#fabd32',
        },
        tertiary: {
          DEFAULT: '#c6c6c7',
          container: '#0b0d0d',
          fixed: '#e2e2e2',
          'fixed-dim': '#c6c6c7',
        },
        error: {
          DEFAULT: '#ffb4ab',
          container: '#93000a',
        },
        outline: { DEFAULT: '#929095', variant: '#47464b' },
        status: {
          success: '#1a9e6a',
          warning: '#e5990a',
          error: '#d93025',
          info: '#2563eb',
        },
        gold: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          400: '#fabd32',
          600: '#d97706',
          800: '#92400e',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      fontSize: {
        'display-lg': ['28px', { lineHeight: '1.2', fontWeight: '600', letterSpacing: '-0.02em' }],
        'headline-md': ['22px', { lineHeight: '1.2', fontWeight: '500' }],
        'title-sm': ['18px', { lineHeight: '1.2', fontWeight: '500' }],
        'body-md': ['14px', { lineHeight: '1.5', fontWeight: '400' }],
        'label-caps': ['11px', { lineHeight: '1.2', fontWeight: '500', letterSpacing: '0.08em' }],
        'status-badge': ['11px', { lineHeight: '1.0', fontWeight: '600' }],
        'price-display': ['16px', { lineHeight: '1.2', fontWeight: '600' }],
      },
      borderRadius: {
        card: '20px',
        btn: '14px',
        input: '12px',
        pill: '9999px',
      },
      spacing: {
        xs: '8px',
        sm: '12px',
        md: '16px',
        lg: '24px',
        xl: '32px',
      },
      maxWidth: {
        mobile: '480px',
      },
      animation: {
        'pulse-brand': 'pulse 2s ease-in-out infinite',
        'fade-in': 'fadeInUp 0.3s ease-out forwards',
      },
      keyframes: {
        pulse: {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.5', transform: 'scale(1.3)' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
