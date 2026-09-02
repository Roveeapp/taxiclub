import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * El contrato del tema: la paleta vive en variables CSS, en canales RGB, y hay
 * dos temas que redefinen las mismas claves.
 *
 * Se comprueba sobre los ficheros porque es donde está el contrato. Lo que un
 * test así no puede ver —que el fondo se aplique de verdad, que el texto se lea
 * sobre él— se comprueba en el navegador con Playwright; y de hecho el fallo
 * más grave de este trabajo lo destapó una captura y no un test: convertí los
 * `var()` de los componentes y me dejé los de main.css, así que la app de
 * cliente se quedó blanca con su texto claro encima.
 */
const RAIZ = join(__dirname, '../..')
const leer = (ruta: string) => readFileSync(join(RAIZ, ruta), 'utf8')

const css = leer('app/assets/css/main.css')
const config = leer('tailwind.config.ts')

function bloque(selector: string): Record<string, string> {
  const i = css.indexOf(selector)
  expect(i, `no encuentro el bloque ${selector}`).toBeGreaterThan(-1)
  const j = css.indexOf('  }', i)
  const out: Record<string, string> = {}
  for (const m of css.slice(i, j).matchAll(/(--[a-z0-9-]+):\s*([^;]+);/g)) out[m[1]] = m[2].trim()
  return out
}

const oscuro = bloque(':root,')
const claro = bloque('[data-tema="claro"]')

describe('la paleta está en canales RGB', () => {
  it('ningún token se define como hexadecimal', () => {
    // Con un hexadecimal, Tailwind no puede aplicar el modificador de opacidad:
    // `bg-surface` funciona pero `bg-surface/10` NO EMITE REGLA, en silencio.
    const conHex = Object.entries({ ...oscuro, ...claro })
      .filter(([, v]) => v.startsWith('#'))
      .map(([k]) => k)
    expect(conHex).toEqual([])
  })

  it('todos los valores son tres canales de 0 a 255', () => {
    for (const [tema, valores] of [['oscuro', oscuro], ['claro', claro]] as const) {
      for (const [k, v] of Object.entries(valores)) {
        const canales = v.split(/\s+/).map(Number)
        expect(canales, `${tema} ${k}`).toHaveLength(3)
        for (const c of canales) {
          expect(Number.isInteger(c) && c >= 0 && c <= 255, `${tema} ${k} = ${v}`).toBe(true)
        }
      }
    }
  })
})

describe('los dos temas encajan', () => {
  it('el tema claro no inventa tokens que no existan', () => {
    const inventados = Object.keys(claro).filter(k => !(k in oscuro))
    expect(inventados).toEqual([])
  })

  it('deja a propósito la barra lateral oscura, como pide design.md §7', () => {
    // «Sidebar: #0c0c13». Si alguien redefine este token en el tema claro, la
    // barra lateral se vuelve clara y el menú queda ilegible.
    expect(claro['--primary-container']).toBeUndefined()
    expect(oscuro['--primary-container']).toBe('12 12 19')
  })

  it('el fondo y las tarjetas son los que especifica design.md §7', () => {
    expect(claro['--surface']).toBe('248 248 252')              // #f8f8fc
    expect(claro['--surface-container-lowest']).toBe('248 248 252')
    expect(claro['--surface-container']).toBe('255 255 255')    // #ffffff
    expect(claro['--outline-variant']).toBe('235 235 240')      // #ebebf0
  })
})

describe('contraste del tema claro', () => {
  const luminancia = (canales: string) => {
    const f = (v: number) => (v /= 255, v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
    const [r, g, b] = canales.split(/\s+/).map(Number).map(f) as [number, number, number]
    return 0.2126 * r + 0.7152 * g + 0.0722 * b
  }
  const contraste = (a: string, b: string) => {
    const [la, lb] = [luminancia(a), luminancia(b)]
    return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
  }
  /** El valor efectivo de un token en el tema claro. */
  const claroDe = (k: string) => claro[k] ?? oscuro[k]!

  const FONDOS = ['--surface', '--surface-container', '--surface-container-high']

  it('el texto pasa AA sobre los tres fondos claros', () => {
    for (const texto of ['--on-surface', '--on-surface-variant', '--secondary', '--error']) {
      for (const fondo of FONDOS) {
        const r = contraste(claroDe(texto), claroDe(fondo))
        expect(r, `${texto} sobre ${fondo} = ${r.toFixed(2)}`).toBeGreaterThanOrEqual(4.5)
      }
    }
  })

  it('los estados semánticos también', () => {
    // Con los valores del tema oscuro, sobre blanco daban: aviso 2,36 (falla),
    // éxito 3,42 y error 4,77. Por eso el tema claro los redefine.
    for (const estado of ['--status-success', '--status-warning', '--status-error', '--status-info']) {
      for (const fondo of FONDOS) {
        const r = contraste(claroDe(estado), claroDe(fondo))
        expect(r, `${estado} sobre ${fondo} = ${r.toFixed(2)}`).toBeGreaterThanOrEqual(4.5)
      }
    }
  })

  it('el oro de marca es legible como texto, que es su uso mayoritario', () => {
    // #fabd32 sobre blanco da 1,69: ilegible. Y en los paneles el oro es texto
    // o icono en 88 sitios y relleno en 20.
    const r = contraste(claroDe('--color-brand-gold'), claroDe('--surface-container'))
    expect(r, `oro sobre tarjeta = ${r.toFixed(2)}`).toBeGreaterThanOrEqual(4.5)
  })

  it('y como relleno, con su color de texto encima', () => {
    for (const tema of ['claro', 'oscuro'] as const) {
      const valor = (k: string) => tema === 'claro' ? claroDe(k) : oscuro[k]!
      const r = contraste(valor('--on-secondary'), valor('--secondary'))
      expect(r, `on-secondary sobre secondary en ${tema} = ${r.toFixed(2)}`).toBeGreaterThanOrEqual(4.5)
    }
  })
})

describe('Tailwind apunta a las variables', () => {
  it('ningún color de la configuración es un hexadecimal', () => {
    const i = config.indexOf('colors: {')
    const j = config.indexOf('fontFamily:', i)
    const hex = [...config.slice(i, j).matchAll(/#[0-9a-fA-F]{6}/g)].map(m => m[0])
    expect(hex).toEqual([])
  })

  it('todos los colores llevan el marcador de opacidad', () => {
    const i = config.indexOf('colors: {')
    const j = config.indexOf('fontFamily:', i)
    const valores = [...config.slice(i, j).matchAll(/'(rgb\(var\(--[a-z0-9-]+\)[^']*)'/g)].map(m => m[1])
    expect(valores.length).toBeGreaterThan(40)
    for (const v of valores) {
      expect(v, v).toContain('<alpha-value>')
    }
  })

  it('existen success, warning e info, que el código usa en 95 sitios', () => {
    // No existían como colores de nivel superior, así que `text-success`,
    // `bg-warning/10` y `bg-info/15` no emitían ni una regla: los estados
    // semánticos de los dos paneles se renderizaban sin color.
    for (const token of ['success', 'warning', 'info']) {
      expect(config).toMatch(new RegExp(`^\\s{8}${token}: 'rgb\\(var\\(--status-`, 'm'))
    }
  })

  it('no queda ningún var() de paleta sin envolver en rgb()', () => {
    // Este es el fallo que dejó la app de cliente en blanco: `var(--surface)`
    // vale «18 18 28», que no es un color válido, así que la declaración se
    // descarta y el fondo se queda transparente.
    const tokens = Object.keys(oscuro)
    for (const ruta of ['app/assets/css/main.css', 'app/layouts/default.vue', 'app/layouts/dashboard.vue']) {
      const texto = leer(ruta)
      // Fuera comentarios, que citan la forma incorrecta al explicarla
      const codigo = texto.split('\n').filter(l => !/^\s*(\*|\/\/|\/\*|--)/.test(l)).join('\n')
      for (const m of codigo.matchAll(/(?<!rgb\()var\((--[a-z0-9-]+)\)/g)) {
        expect(tokens, `${ruta}: ${m[0]} sin rgb()`).not.toContain(m[1])
      }
    }
  })
})
