import { test, expect } from '@playwright/test'

test.describe('Flujo de reserva — smoke', () => {
  test('la home carga con el formulario de búsqueda', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: /¿A dónde te llevamos\?/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /Buscar Disponibilidad/i })).toBeVisible()
  })

  test('el botón de buscar está deshabilitado sin datos', async ({ page }) => {
    await page.goto('/')
    const cta = page.getByRole('button', { name: /Buscar Disponibilidad/i })
    await expect(cta).toBeDisabled()
  })

  test('navegación a Última Hora', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('link', { name: /Ver todo/i }).click()
    await expect(page).toHaveURL(/\/ultima-hora/)
    await expect(page.getByRole('heading', { name: /Última Hora/i })).toBeVisible()
  })

  test('login carga y valida el formulario', async ({ page }) => {
    await page.goto('/cuenta/login')
    await expect(page.getByRole('heading', { name: /Iniciar sesión/i })).toBeVisible()
    const submit = page.getByRole('button', { name: /Iniciar sesión/i }).last()
    await expect(submit).toBeDisabled()
  })
})
