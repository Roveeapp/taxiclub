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
        // La familia `tertiary` completa —7 tokens— se retira: cero referencias
        // en todo el proyecto, ni como utilidad ni por CSS ni en el tema de
        // PrimeVue. Igual que `gold-accent` y `surface-card` antes. Un token que
        // nadie usa no es una opción disponible: es una decisión que parece
        // tomada y no lo está, y aquí además había que darle un valor claro.
        //
        // Todos los colores apuntan a las variables de main.css, en canales RGB
        // para que los modificadores de opacidad (`bg-secondary/10`) funcionen.
        // Es lo que hace posible el tema claro de los paneles sin tocar las 721
        // utilidades que hay en /taxista y /admin.
        brand: {
          dark: 'rgb(var(--color-brand-dark) / <alpha-value>)',
          gold: 'rgb(var(--color-brand-gold) / <alpha-value>)',
          white: 'rgb(var(--color-brand-white) / <alpha-value>)',
        },
        surface: {
          DEFAULT: 'rgb(var(--surface) / <alpha-value>)',
          dim: 'rgb(var(--surface-dim) / <alpha-value>)',
          bright: 'rgb(var(--surface-bright) / <alpha-value>)',
          'container-lowest': 'rgb(var(--surface-container-lowest) / <alpha-value>)',
          'container-low': 'rgb(var(--surface-container-low) / <alpha-value>)',
          'container': 'rgb(var(--surface-container) / <alpha-value>)',
          'container-high': 'rgb(var(--surface-container-high) / <alpha-value>)',
          'container-highest': 'rgb(var(--surface-container-highest) / <alpha-value>)',
          dark: 'rgb(var(--surface-dark) / <alpha-value>)',
          input: 'rgb(var(--surface-input) / <alpha-value>)',
          divider: 'rgb(var(--surface-divider) / <alpha-value>)',
        },
        on: {
          surface: 'rgb(var(--on-surface) / <alpha-value>)',
          'surface-variant': 'rgb(var(--on-surface-variant) / <alpha-value>)',
          primary: 'rgb(var(--on-primary) / <alpha-value>)',
          'primary-container': 'rgb(var(--on-primary-container) / <alpha-value>)',
          secondary: 'rgb(var(--on-secondary) / <alpha-value>)',
          'secondary-container': 'rgb(var(--on-secondary-container) / <alpha-value>)',
          background: 'rgb(var(--on-background) / <alpha-value>)',
          error: 'rgb(var(--on-error) / <alpha-value>)',
          'error-container': 'rgb(var(--on-error-container) / <alpha-value>)',
        },
        primary: {
          DEFAULT: 'rgb(var(--primary) / <alpha-value>)',
          container: 'rgb(var(--primary-container) / <alpha-value>)',
          fixed: 'rgb(var(--primary-fixed) / <alpha-value>)',
          'fixed-dim': 'rgb(var(--primary-fixed-dim) / <alpha-value>)',
          inverse: 'rgb(var(--inverse-primary) / <alpha-value>)',
        },
        secondary: {
          DEFAULT: 'rgb(var(--secondary) / <alpha-value>)',
          container: 'rgb(var(--secondary-container) / <alpha-value>)',
          fixed: 'rgb(var(--secondary-fixed) / <alpha-value>)',
          'fixed-dim': 'rgb(var(--secondary-fixed-dim) / <alpha-value>)',
        },
        error: {
          DEFAULT: 'rgb(var(--error) / <alpha-value>)',
          container: 'rgb(var(--error-container) / <alpha-value>)',
        },
        outline: {
          DEFAULT: 'rgb(var(--outline) / <alpha-value>)',
          variant: 'rgb(var(--outline-variant) / <alpha-value>)',
        },
        // Tarjetas blancas sobre la app oscura: el formulario de búsqueda y el
        // de acceso. Los tonos de `on-surface` están pensados para leerse sobre
        // fondo oscuro y aquí no sirven. Ver main.css.
        'on-light': {
          DEFAULT: 'rgb(var(--on-light) / <alpha-value>)',
          variant: 'rgb(var(--on-light-variant) / <alpha-value>)',
          muted: 'rgb(var(--on-light-muted) / <alpha-value>)',
        },
        'light-border': 'rgb(var(--light-border) / <alpha-value>)',
        status: {
          success: 'rgb(var(--status-success) / <alpha-value>)',
          warning: 'rgb(var(--status-warning) / <alpha-value>)',
          error: 'rgb(var(--status-error) / <alpha-value>)',
          info: 'rgb(var(--status-info) / <alpha-value>)',
        },
        // `success`, `warning` e `info` sueltos NO EXISTÍAN, y el código los usa
        // en 95 sitios: `text-success`, `bg-warning/10`, `bg-info/15`… Todas
        // esas clases no emitían ni una regla, comprobado sobre el CSS
        // construido. Es decir, los estados semánticos de todo el panel de
        // admin y del de taxista —el verde de «completado», el ámbar de
        // «pendiente», el azul informativo— se renderizaban sin color.
        success: 'rgb(var(--status-success) / <alpha-value>)',
        warning: 'rgb(var(--status-warning) / <alpha-value>)',
        info: 'rgb(var(--status-info) / <alpha-value>)',
        gold: {
          50: 'rgb(var(--gold-50) / <alpha-value>)',
          100: 'rgb(var(--gold-100) / <alpha-value>)',
          200: 'rgb(var(--gold-200) / <alpha-value>)',
          400: 'rgb(var(--gold-400) / <alpha-value>)',
          600: 'rgb(var(--gold-600) / <alpha-value>)',
          800: 'rgb(var(--gold-800) / <alpha-value>)',
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
