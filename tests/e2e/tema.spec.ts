import { test, expect } from '@playwright/test'

/**
 * El tema, comprobado en un navegador de verdad.
 *
 * Existe porque el fallo más grave de este trabajo no lo podía ver ningún test
 * de fichero: al pasar la paleta a canales RGB convertí los `var()` de los
 * componentes y me dejé los de `main.css`, así que `background-color:
 * var(--surface)` valía «18 18 28» —que no es un color— y la app de cliente se
 * quedó BLANCA con su texto claro encima, ilegible.
 *
 * Lo destapó una captura de pantalla. El chequeo de colores calculados lo había
 * dicho —«rgba(0, 0, 0, 0)»— y lo leí como un selector mal puesto. Un fondo
 * transparente es exactamente el síntoma, así que aquí se comprueba en voz alta.
 *
 * Las rutas de panel necesitan sesión de admin, y este fichero no la monta: eso
 * se comprueba con el script de verificación manual. Aquí van las públicas, que
 * son las que garantizan que la app de cliente sigue oscura.
 */

const OSCURO = 'rgb(18, 18, 28)'

/** Ni transparente ni sin definir. */
function tieneFondo(color: string) {
  return color !== 'rgba(0, 0, 0, 0)' && color !== 'transparent' && color !== ''
}

test.describe('tema de la app de cliente', () => {
  for (const ruta of ['/', '/ultima-hora', '/cuenta/login']) {
    test(`${ruta} se pinta sobre el fondo oscuro`, async ({ page }) => {
      await page.goto(ruta)
      await page.waitForLoadState('networkidle')

      // No lleva el atributo del tema claro: ese es solo de los paneles
      await expect(page.locator('html')).not.toHaveAttribute('data-tema', 'claro')

      const fondos = await page.evaluate(() => {
        const raiz = document.querySelector('main')?.parentElement
        return {
          body: getComputedStyle(document.body).backgroundColor,
          raiz: raiz ? getComputedStyle(raiz).backgroundColor : '',
        }
      })
      // Alguno de los dos tiene que pintar el fondo, y tiene que ser el oscuro
      const efectivo = tieneFondo(fondos.raiz) ? fondos.raiz : fondos.body
      expect(efectivo, `fondo efectivo de ${ruta}`).toBe(OSCURO)
    })
  }

  test('el texto principal es claro, no oscuro sobre oscuro', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    const color = await page.locator('.text-on-surface').first().evaluate(el => getComputedStyle(el).color)
    expect(color).toBe('rgb(228, 225, 239)')
  })
})

test.describe('el CTA principal es legible', () => {
  test('oro de marca con texto oscuro encima, no blanco', async ({ page }) => {
    // Antes el botón caía al estilo propio de PrimeVue: #f0b429 con etiqueta
    // blanca, 1,86 de contraste, en los 30 CTA de la aplicación.
    await page.goto('/cuenta/login')
    await page.waitForLoadState('networkidle')
    await page.fill('input[type="email"]', 'alguien@ejemplo.com')
    await page.fill('input[type="password"]', 'contrasena123')

    const boton = page.getByRole('button', { name: /Iniciar sesión/i }).last()
    await expect(boton).toBeEnabled()
    const estilo = await boton.evaluate(el => {
      const cs = getComputedStyle(el)
      return { fondo: cs.backgroundColor, texto: cs.color }
    })
    expect(estilo.fondo).toBe('rgb(250, 189, 50)')   // #fabd32, el oro de marca
    expect(estilo.texto).toBe('rgb(65, 45, 0)')      // #412d00, 7,74 de contraste
  })
})

test.describe('las utilidades de estado emiten color', () => {
  test('text-success no es una clase muerta', async ({ page }) => {
    // `success`, `warning` e `info` no existían como colores de Tailwind, así
    // que 95 usos en el código no emitían ni una regla y los estados
    // semánticos de los paneles se renderizaban sin color.
    await page.goto('/')
    const color = await page.evaluate(() => {
      const d = document.createElement('div')
      d.className = 'text-success'
      document.body.appendChild(d)
      const c = getComputedStyle(d).color
      d.remove()
      return c
    })
    // #1a9e6a en el tema oscuro
    expect(color).toBe('rgb(26, 158, 106)')
  })
})
