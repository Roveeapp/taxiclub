import { definePreset } from '@primeuix/themes'
import Aura from '@primeuix/themes/aura'

const ClubTaxis = definePreset(Aura, {
  primitive: {
    gold: {
      50: '#fffbeb',
      100: '#fef3c7',
      200: '#fde68a',
      300: '#fcd34d',
      400: '#fabd32',
      500: '#f0b429',
      600: '#d97706',
      700: '#b45309',
      800: '#92400e',
      900: '#78350f',
      950: '#451a03',
    },
    dark: {
      50: '#f4f4f8',
      100: '#e4e4ec',
      200: '#c8c5cf',
      300: '#7b7983',
      400: '#5e5d66',
      500: '#47464b',
      600: '#393843',
      700: '#34343f',
      800: '#292934',
      900: '#1f1f29',
      950: '#0c0c13',
    },
  },
  semantic: {
    primary: {
      50: '{gold.50}',
      100: '{gold.100}',
      200: '{gold.200}',
      300: '{gold.300}',
      400: '{gold.400}',
      500: '{gold.500}',
      600: '{gold.600}',
      700: '{gold.700}',
      800: '{gold.800}',
      900: '{gold.900}',
      950: '{gold.950}',
    },
    colorScheme: {
      light: {
        surface: {
          0: '#ffffff',
          50: '{dark.50}',
          100: '{dark.100}',
          200: '{dark.200}',
          300: '{dark.300}',
          400: '{dark.400}',
          500: '{dark.500}',
          600: '{dark.600}',
          700: '{dark.700}',
          800: '{dark.800}',
          900: '{dark.900}',
          950: '{dark.950}',
        },
      },
    },
  },
})

export default {
  preset: ClubTaxis,
  options: {
    darkModeSelector: false,
  },
}
