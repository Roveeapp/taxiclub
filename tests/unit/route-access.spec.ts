import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { requiredRolesForPath, isRoleAllowed } from '../../app/server/utils/accessControl'

/**
 * Matriz de acceso «rol × ruta → resultado esperado» sobre TODAS las rutas de
 * la API.
 *
 * Las rutas se enumeran leyendo el directorio en tiempo de test, no de una
 * lista escrita a mano. Eso es lo que le da valor: una ruta nueva entra en la
 * matriz sola, y si no está declarada como pública, el test falla hasta que
 * alguien decida conscientemente qué acceso tiene.
 *
 * Es la clase de test que faltaba: las 29 rutas de /api/taxista/ se quedaron
 * sin comprobar el rol durante meses, y bastaba una prueba de este tipo para
 * detectarlo.
 */

const API_DIR = join(__dirname, '../../app/server/api')

interface Ruta {
  fichero: string
  urlPath: string
  metodo: string
  seAutoprotege: boolean
}

function listarFicheros(dir: string): string[] {
  const salida: string[] = []
  for (const entrada of readdirSync(dir)) {
    const completo = join(dir, entrada)
    if (statSync(completo).isDirectory()) salida.push(...listarFicheros(completo))
    else if (entrada.endsWith('.ts')) salida.push(completo)
  }
  return salida
}

/** `admin/paradas/[id].patch.ts` → `{ urlPath: '/api/admin/paradas/:id', metodo: 'PATCH' }` */
function analizar(fichero: string): Ruta {
  const rel = relative(API_DIR, fichero).split(sep).join('/')
  const contenido = readFileSync(fichero, 'utf8')

  const sinExt = rel.replace(/\.ts$/, '')
  const partes = sinExt.split('/')
  const ultimo = partes.pop() as string

  // El método va en el sufijo del nombre: `index.post` → POST
  const trozos = ultimo.split('.')
  const metodo = trozos.length > 1 ? (trozos.pop() as string).toUpperCase() : 'GET'
  const nombre = trozos.join('.')

  const segmentos = [...partes, nombre === 'index' ? '' : nombre].filter(Boolean)
  const urlPath = '/api/' + segmentos.join('/').replace(/\[([^\]]+)\]/g, ':$1')

  return {
    fichero: rel,
    urlPath,
    metodo,
    seAutoprotege: /require(?:Auth|Role|AnyRole)\s*\(/.test(contenido),
  }
}

const rutas = listarFicheros(API_DIR).map(analizar)

/**
 * Rutas que NO exigen sesión, cada una por un motivo deliberado.
 *
 * Esta lista es el contrato: si aparece una ruta pública que no está aquí, el
 * test falla. Añadir una entrada obliga a justificarla, que es precisamente lo
 * que no ocurrió con las rutas de taxista.
 */
const PUBLICAS: Record<string, string> = {
  'GET /api/config': 'configuración pública del negocio (tarifas, antelación mínima)',
  'GET /api/stations': 'listado de paradas, necesario para el buscador antes de identificarse',
  'GET /api/paradas': 'idem, alias en castellano',
  'GET /api/accessories': 'accesorios disponibles, para el formulario de reserva',
  'GET /api/addresses/search': 'autocompletado de direcciones; limitado por IP',
  'GET /api/ofertas': 'ofertas de última hora, es un escaparate público',
  'GET /api/ofertas/:id': 'detalle de una oferta pública',
  'POST /api/ofertas/:id/intent': 'reserva de oferta como invitado; limitada por IP',
  'POST /api/ofertas/:id/reservar': 'reserva de oferta como invitado; limitada por IP',
  'POST /api/bookings': 'reserva como invitado, sin cuenta; limitada por IP',
  'GET /api/bookings/:id': 'acceso del invitado con token firmado; verifica el token',
  'DELETE /api/bookings/:id': 'cancelación del invitado con token firmado; verifica el token',
  'POST /api/payments/create-intent': 'presupuesto antes de identificarse; limitada por IP',
  'POST /api/auth/register': 'alta de cuenta; el rol está restringido a client/driver',
  'POST /api/auth/forgot-password': 'recuperación de contraseña',
  'POST /api/log-error': 'errores del cliente; limitada por IP',
}

const ROLES = ['anon', 'client', 'driver', 'admin'] as const

/** Qué debería pasar con cada rol en una ruta dada. */
function esperado(ruta: Ruta, rol: typeof ROLES[number]) {
  const rolesExigidos = requiredRolesForPath(ruta.urlPath)
  const clave = `${ruta.metodo} ${ruta.urlPath}`

  if (rolesExigidos) {
    if (rol === 'anon') return 401
    return isRoleAllowed(rol, rolesExigidos) ? 'permitido' : 403
  }
  if (clave in PUBLICAS) return 'permitido'
  // Ruta sin prefijo protegido y no declarada pública: exige sesión
  return rol === 'anon' ? 401 : 'permitido'
}

describe('inventario de rutas', () => {
  it('encuentra las rutas de la API', () => {
    expect(rutas.length).toBeGreaterThan(70)
  })

  it('deriva bien el método y la URL del nombre del fichero', () => {
    const porFichero = new Map(rutas.map(r => [r.fichero, r]))
    expect(porFichero.get('bookings/index.post.ts')).toMatchObject({
      urlPath: '/api/bookings', metodo: 'POST',
    })
    expect(porFichero.get('admin/paradas/[id].patch.ts')).toMatchObject({
      urlPath: '/api/admin/paradas/:id', metodo: 'PATCH',
    })
    expect(porFichero.get('taxista/reservas/[id]/confirmar.post.ts')).toMatchObject({
      urlPath: '/api/taxista/reservas/:id/confirmar', metodo: 'POST',
    })
  })
})

describe('matriz rol × ruta', () => {
  it('ninguna ruta queda sin decidir: o la protege un prefijo, o se autoprotege, o está declarada pública', () => {
    const huerfanas = rutas.filter((r) => {
      const clave = `${r.metodo} ${r.urlPath}`
      return !requiredRolesForPath(r.urlPath) && !r.seAutoprotege && !(clave in PUBLICAS)
    })
    expect(huerfanas.map(r => `${r.metodo} ${r.urlPath}`)).toEqual([])
  })

  it('un anónimo no entra en ninguna ruta protegida por prefijo', () => {
    const filtradas = rutas.filter(r => requiredRolesForPath(r.urlPath))
    expect(filtradas.length).toBeGreaterThan(40)
    for (const r of filtradas) {
      expect(esperado(r, 'anon'), r.urlPath).toBe(401)
    }
  })

  it('un cliente no entra en ninguna ruta de taxista ni de admin', () => {
    const restringidas = rutas.filter(r => requiredRolesForPath(r.urlPath))
    for (const r of restringidas) {
      expect(esperado(r, 'client'), `${r.metodo} ${r.urlPath}`).toBe(403)
    }
  })

  it('un taxista no entra en las rutas de admin', () => {
    const admin = rutas.filter(r => r.urlPath.startsWith('/api/admin/'))
    expect(admin.length).toBeGreaterThan(20)
    for (const r of admin) {
      expect(esperado(r, 'driver'), r.urlPath).toBe(403)
    }
  })

  it('un taxista entra en las rutas de taxista', () => {
    const taxista = rutas.filter(r => r.urlPath.startsWith('/api/taxista/'))
    expect(taxista.length).toBeGreaterThan(25)
    for (const r of taxista) {
      expect(esperado(r, 'driver'), r.urlPath).toBe('permitido')
    }
  })

  it('el admin entra en las de taxista, porque en este club también conduce', () => {
    const taxista = rutas.filter(r => r.urlPath.startsWith('/api/taxista/'))
    for (const r of taxista) {
      expect(esperado(r, 'admin'), r.urlPath).toBe('permitido')
    }
  })

  it('toda ruta pública declarada existe de verdad', () => {
    // Si se borra o renombra una ruta, su entrada aquí debe desaparecer también
    const reales = new Set(rutas.map(r => `${r.metodo} ${r.urlPath}`))
    const fantasmas = Object.keys(PUBLICAS).filter(k => !reales.has(k))
    expect(fantasmas).toEqual([])
  })

  it('ninguna ruta pública toca los prefijos protegidos', () => {
    const contradicciones = Object.keys(PUBLICAS).filter((k) => {
      const path = k.split(' ')[1] as string
      return Boolean(requiredRolesForPath(path))
    })
    expect(contradicciones).toEqual([])
  })
})

describe('cobertura por área', () => {
  it('todas las rutas de taxista y de admin están cubiertas por el prefijo', () => {
    const sinCubrir = rutas
      .filter(r => r.urlPath.startsWith('/api/taxista/') || r.urlPath.startsWith('/api/admin/'))
      .filter(r => !requiredRolesForPath(r.urlPath))
    expect(sinCubrir.map(r => r.urlPath)).toEqual([])
  })

  it('las rutas del cliente autenticado se autoprotegen con requireAuth', () => {
    // Ni las protege un prefijo ni son públicas, así que la comprobación es suya
    const propias = rutas.filter((r) => {
      const clave = `${r.metodo} ${r.urlPath}`
      return !requiredRolesForPath(r.urlPath) && !(clave in PUBLICAS)
    })
    expect(propias.length).toBeGreaterThan(0)
    for (const r of propias) {
      expect(r.seAutoprotege, `${r.metodo} ${r.urlPath} no llama a requireAuth`).toBe(true)
    }
  })
})
