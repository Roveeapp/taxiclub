import { describe, it, expect } from 'vitest'
import { resolverParadaDestino } from '../../app/server/utils/stationMatch'

/**
 * Las cinco paradas reales del club, con sus coordenadas de producción. Se usan
 * las de verdad a propósito: el fallo que motiva este fichero solo se ve con
 * ellas —«Pravia» es una parada Y una localidad entera, y tres de los cinco
 * nombres llevan raya—, y con datos inventados el test habría pasado.
 */
const PARADAS = [
  { id: 'aeropuerto', name: 'Aeropuerto de Asturias', lat: 43.5634, lng: -6.0346, is_active: true },
  { id: 'pravia', name: 'Pravia', lat: 43.4949, lng: -6.1053, is_active: true },
  { id: 'aviles', name: 'Avilés — RENFE', lat: 43.5565, lng: -5.9249, is_active: true },
  { id: 'gijon', name: 'Gijón — FEVE / Cercanías', lat: 43.5332, lng: -5.6615, is_active: true },
  { id: 'oviedo', name: 'Oviedo — RENFE', lat: 43.3614, lng: -5.849, is_active: true },
]

describe('el fallo que arregla: coincidencia por texto', () => {
  it('una calle de Pravia NO es la parada de Pravia', () => {
    // La regla anterior era `dest.includes('pravia')`, así que ataba esta
    // reserva a la parada y le aplicaba su tarifa fija.
    const r = resolverParadaDestino(PARADAS, { destinationAddress: 'Calle Uría, Pravia' })
    expect(r.stationId).toBeNull()
  })

  it('tampoco lo son las demás direcciones dentro de una localidad con parada', () => {
    const direcciones = [
      'Avenida de Gijón 14, Avilés',
      'Plaza del Ayuntamiento, Gijón',
      'Calle Fruela 3, Oviedo',
      'Hotel Palacio de Luces, Pravia',
      'Polígono de Asipo, Llanera',
    ]
    for (const d of direcciones) {
      expect(resolverParadaDestino(PARADAS, { destinationAddress: d }).stationId, d).toBeNull()
    }
  })

  it('y la parada de verdad SÍ se reconoce, que es lo que antes fallaba', () => {
    // «Oviedo — RENFE» lleva raya, así que el texto «Oviedo, Asturias» no
    // contenía su nombre y la parada real pasaba desapercibida.
    expect(resolverParadaDestino(PARADAS, { destinationAddress: 'Oviedo — RENFE' }).stationId).toBe('oviedo')
    expect(resolverParadaDestino(PARADAS, { destinationAddress: 'Oviedo - RENFE, Asturias' }).stationId).toBe('oviedo')
    expect(resolverParadaDestino(PARADAS, { destinationAddress: 'Aeropuerto de Asturias, Santiago del Monte' }).stationId).toBe('aeropuerto')
  })

  it('la parada que es solo el nombre de la localidad se reconoce si el destino es exactamente eso', () => {
    expect(resolverParadaDestino(PARADAS, { destinationAddress: 'Pravia' }).stationId).toBe('pravia')
    expect(resolverParadaDestino(PARADAS, { destinationAddress: 'Pravia, Asturias' }).stationId).toBe('pravia')
  })

  it('ignora acentos y mayúsculas, pero no por eso se relaja', () => {
    expect(resolverParadaDestino(PARADAS, { destinationAddress: 'AVILES RENFE' }).stationId).toBe('aviles')
    expect(resolverParadaDestino(PARADAS, { destinationAddress: 'aviles - renfe' }).stationId).toBe('aviles')
    expect(resolverParadaDestino(PARADAS, { destinationAddress: 'cerca de aviles renfe' }).stationId).toBeNull()
  })
})

describe('prioridad de las tres señales', () => {
  it('lo que el cliente eligió manda sobre el texto', () => {
    const r = resolverParadaDestino(PARADAS, {
      destinationStationId: 'gijon',
      destinationAddress: 'Pravia',
    })
    expect(r).toEqual({ stationId: 'gijon', origen: 'declarada' })
  })

  it('un id de parada inventado no se acepta, y tampoco se cae al texto', () => {
    // Si se cayera al cotejo por nombre, mandar un id falso junto a un texto
    // elegido sería una forma de forzar una tarifa fija.
    const r = resolverParadaDestino(PARADAS, {
      destinationStationId: '00000000-0000-0000-0000-000000000000',
      destinationAddress: 'Pravia',
    })
    expect(r).toEqual({ stationId: null, origen: null })
  })

  it('una parada desactivada no vale ni declarada ni por nombre', () => {
    const conBaja = PARADAS.map(p => p.id === 'pravia' ? { ...p, is_active: false } : p)
    expect(resolverParadaDestino(conBaja, { destinationStationId: 'pravia' }).stationId).toBeNull()
    expect(resolverParadaDestino(conBaja, { destinationAddress: 'Pravia' }).stationId).toBeNull()
  })

  it('las coordenadas mandan sobre el texto', () => {
    // Coordenadas de la estación de Gijón con un texto que dice «Pravia»
    const r = resolverParadaDestino(PARADAS, {
      destinationAddress: 'Pravia',
      destinationLat: 43.5332,
      destinationLng: -5.6615,
    })
    expect(r).toEqual({ stationId: 'gijon', origen: 'coordenadas' })
  })
})

describe('cotejo por coordenadas', () => {
  it('reconoce la parada estando encima', () => {
    const r = resolverParadaDestino(PARADAS, { destinationLat: 43.5634, destinationLng: -6.0346 })
    expect(r).toEqual({ stationId: 'aeropuerto', origen: 'coordenadas' })
  })

  it('un punto a 3 km de la parada NO es la parada', () => {
    // 3 km es el radio que usan las rutas fijas para «cerca de»; aquí la
    // pregunta es «¿es esta parada?», y a 3 km la respuesta es no.
    const r = resolverParadaDestino(PARADAS, { destinationLat: 43.5364, destinationLng: -6.0346 })
    expect(r.stationId).toBeNull()
  })

  it('elige la más cercana, no la primera de la tabla', () => {
    // Con DOS paradas dentro del radio, que es el único caso en que la regla
    // «la más cercana» se distingue de «la primera que encuentre». Es
    // plausible: una estación de tren y una parada de taxis a 200 m.
    const dos = [
      { id: 'lejana', name: 'Oviedo — Autobuses', lat: 43.3640, lng: -5.849, is_active: true },
      { id: 'cercana', name: 'Oviedo — RENFE', lat: 43.3614, lng: -5.849, is_active: true },
    ]
    const punto = { destinationLat: 43.3615, destinationLng: -5.849 }
    expect(resolverParadaDestino(dos, punto).stationId).toBe('cercana')
    // Y el resultado no cambia si se invierte el orden de la tabla
    expect(resolverParadaDestino([...dos].reverse(), punto).stationId).toBe('cercana')
  })

  it('con coordenadas y ninguna parada cerca, no se cae al texto', () => {
    // Este es el caso que importa: el cliente eligió un punto del mapa que
    // está en Pravia pueblo pero no en la parada. Que el texto diga «Pravia»
    // no debe devolver la tarifa fija de la parada.
    const r = resolverParadaDestino(PARADAS, {
      destinationAddress: 'Calle La Peral, Pravia',
      destinationLat: 43.4880,
      destinationLng: -6.1120,
    })
    expect(r).toEqual({ stationId: null, origen: null })
  })

  it('unas coordenadas imposibles no cuentan como coordenadas', () => {
    const r = resolverParadaDestino(PARADAS, {
      destinationAddress: 'Pravia',
      destinationLat: Number.NaN,
      destinationLng: Number.NaN,
    })
    // Cae al cotejo por nombre, que es correcto: no había coordenadas de verdad
    expect(r).toEqual({ stationId: 'pravia', origen: 'nombre' })
  })

  it('una parada sin coordenadas no rompe el recorrido', () => {
    const sinCoords = PARADAS.map(p => p.id === 'gijon' ? { ...p, lat: null, lng: null } : p)
    const r = resolverParadaDestino(sinCoords, { destinationLat: 43.5634, destinationLng: -6.0346 })
    expect(r.stationId).toBe('aeropuerto')
  })
})

describe('casos vacíos', () => {
  it('sin ninguna señal no hay parada', () => {
    expect(resolverParadaDestino(PARADAS, {})).toEqual({ stationId: null, origen: null })
    expect(resolverParadaDestino(PARADAS, { destinationAddress: '   ' })).toEqual({ stationId: null, origen: null })
  })

  it('sin paradas configuradas tampoco', () => {
    expect(resolverParadaDestino([], { destinationAddress: 'Pravia' }).stationId).toBeNull()
  })
})

/**
 * Corpus de regresión: direcciones copiadas literalmente de la tabla `bookings`
 * de producción, con sus dobles espacios incluidos.
 *
 * La regla vieja ató a una parada las cinco primeras. «Villavaler, Pravia» es
 * el caso que demuestra el fallo: Villavaler es una aldea del concejo de
 * Pravia, no la parada, y esa reserva quedó registrada con la parada de Pravia
 * como destino.
 */
describe('direcciones reales de producción', () => {
  const casos: Array<[string, string | null]> = [
    ['Villavaler,  Pravia,  Asturias / Asturies,  España', null],
    ['Avenida Carmen Miranda,  Pravia,  Praúa,  Pravia', null],
    ['Gijón / Xixón,  Asturias / Asturies,  España', null],
    ['Pravia,  Asturias / Asturies,  33120,  España', 'pravia'],
    ['Aeropuerto de Asturias', 'aeropuerto'],
  ]
  for (const [direccion, esperado] of casos) {
    it(`«${direccion}» → ${esperado ?? 'ninguna parada'}`, () => {
      expect(resolverParadaDestino(PARADAS, { destinationAddress: direccion }).stationId).toBe(esperado)
    })
  }

  it('queda un falso positivo estrecho, y conviene tenerlo escrito', () => {
    // Nominatim a veces pone la localidad como primer tramo de una dirección de
    // calle. Aquí el primer tramo es «Pravia» y el resolutor devuelve la parada,
    // igual que antes. Es mucho más estrecho que el `includes` anterior —hace
    // falta que la localidad vaya PRIMERA—, y el camino normal ya no pasa por
    // aquí: el buscador manda las coordenadas y esas resuelven bien el caso.
    const soloTexto = resolverParadaDestino(PARADAS, {
      destinationAddress: 'Pravia,  Calle Ramón Suárez Pazos,  Pravia,  Praúa',
    })
    expect(soloTexto.stationId).toBe('pravia')

    const conCoordenadas = resolverParadaDestino(PARADAS, {
      destinationAddress: 'Pravia,  Calle Ramón Suárez Pazos,  Pravia,  Praúa',
      destinationLat: 43.4901,
      destinationLng: -6.1121,
    })
    expect(conCoordenadas.stationId).toBeNull()
  })
})
