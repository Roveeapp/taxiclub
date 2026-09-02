import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['tests/unit/**/*.spec.ts'],
    environment: 'node',
    // Los composables usan los auto-imports de Nuxt (`ref`, `computed`,
    // `watch`), que es la convención del proyecto. Sin esto no se pueden
    // probar, y por eso app/composables/ no tenía ni un test.
    setupFiles: ['tests/setup/auto-imports.ts'],
  },
})
