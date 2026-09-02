import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { effectScope, nextTick } from 'vue'
import { useBuscadorLugar } from '../../app/composables/useBuscadorLugar'

/**
 * El formulario de reserva tenía dos bloques casi idénticos —origen y destino—
 * que habían divergido: el de origen ofrecía las paradas del club y guardaba el
 * id elegido, el de destino no. Por eso el servidor tenía que adivinar la
 * parada de destino a partir del texto libre, y de esa parada depende la tarifa
 * fija del trayecto.
 *
 * Estos tests fijan el contrato de la única implementación que queda, para que
 * la divergencia no pueda volver: si mañana alguien rompe las coordenadas o el
 * id de parada, se rompe aquí y no en el precio de una reserva.
 */

const PARADAS = [
  { id: 'aeropuerto', name: 'Aeropuerto de Asturias' },
  { id: 'oviedo', name: 'Oviedo — RENFE' },
  { id: 'pravia', name: 'Pravia' },
]

let fetchMock: ReturnType<typeof vi.fn>

/** El composable usa `$fetch` global de Nuxt y `onScopeDispose`. */
function crear() {
  const scope = effectScope()
  const buscador = scope.run(() => useBuscadorLugar({ paradas: () => PARADAS, esperaMs: 0 }))!
  return { buscador, scope }
}

beforeEach(() => {
  vi.useFakeTimers()
  fetchMock = vi.fn().mockResolvedValue([
    { id: 'osm:1', label: 'Calle Uría', description: 'Calle Uría, Oviedo', source: 'osm', lat: 43.36, lng: -5.84 },
  ])
  ;(globalThis as Record<string, unknown>).$fetch = fetchMock
})
afterEach(() => {
  vi.useRealTimers()
  delete (globalThis as Record<string, unknown>).$fetch
})

describe('sugerencias', () => {
  it('ofrece las paradas del club antes que las direcciones', async () => {
    const { buscador } = crear()
    buscador.buscar({ query: 'Oviedo' })
    await vi.runAllTimersAsync()

    expect(buscador.sugerencias.value[0]).toMatchObject({ id: 'oviedo', source: 'station' })
    expect(buscador.sugerencias.value.some(s => s.source === 'osm')).toBe(true)
  })

  it('con una sola letra ofrece paradas y no consulta direcciones', async () => {
    const { buscador } = crear()
    buscador.buscar({ query: 'P' })
    await vi.runAllTimersAsync()

    // Coinciden dos, y está bien: la coincidencia es por subcadena, así que
    // «aeroPuerto» también contiene una p. En un desplegable eso es ruido
    // tolerable; lo que importa es que no se consulte Nominatim con una letra.
    expect(buscador.sugerencias.value.map(s => s.id)).toEqual(['aeropuerto', 'pravia'])
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('si el buscador de direcciones falla, quedan las paradas', async () => {
    fetchMock.mockRejectedValue(new Error('Nominatim caído'))
    const { buscador } = crear()
    buscador.buscar({ query: 'Pravia' })
    await vi.runAllTimersAsync()

    expect(buscador.sugerencias.value.map(s => s.id)).toEqual(['pravia'])
  })
})

describe('elegir una sugerencia', () => {
  it('elegir una parada guarda su id, que es lo que el destino no hacía', () => {
    const { buscador } = crear()
    buscador.elegir({ value: { id: 'oviedo', label: 'Oviedo — RENFE', description: 'Oviedo — RENFE', source: 'station' } })

    expect(buscador.stationId.value).toBe('oviedo')
    expect(buscador.texto.value).toBe('Oviedo — RENFE')
  })

  it('elegir una dirección guarda sus coordenadas, que se tiraban a la basura', () => {
    const { buscador } = crear()
    buscador.elegir({ value: { id: 'osm:1', label: 'Calle Uría', description: 'Calle Uría, Oviedo', source: 'osm', lat: 43.36, lng: -5.84 } })

    expect(buscador.stationId.value).toBe('')
    expect(buscador.coords.value).toEqual({ lat: 43.36, lng: -5.84 })
  })

  it('una sugerencia sin coordenadas no inventa ninguna', () => {
    const { buscador } = crear()
    buscador.elegir({ value: { id: 'x', label: 'Sitio', description: 'Sitio', source: 'saved' } })
    expect(buscador.coords.value).toBeNull()
  })
})

describe('editar el texto invalida la elección', () => {
  it('cambiar el texto tras elegir una parada suelta la parada', async () => {
    const { buscador } = crear()
    buscador.elegir({ value: { id: 'pravia', label: 'Pravia', description: 'Pravia', source: 'station' } })
    expect(buscador.stationId.value).toBe('pravia')

    buscador.consulta.value = 'Pravi'
    await nextTick()
    expect(buscador.stationId.value).toBe('')
    expect(buscador.coords.value).toBeNull()
  })

  it('y suelta también las coordenadas de una dirección anterior', async () => {
    // Unas coordenadas del sitio anterior son peor que ninguna: el servidor se
    // las cree y cotiza el viaje con ellas.
    const { buscador } = crear()
    buscador.elegir({ value: { id: 'osm:1', label: 'Calle Uría', description: 'Calle Uría, Oviedo', source: 'osm', lat: 43.36, lng: -5.84 } })

    buscador.consulta.value = 'Calle Melquiades Álvarez, Oviedo'
    await nextTick()
    expect(buscador.coords.value).toBeNull()
  })

  it('reescribir el nombre exacto de la parada la mantiene', async () => {
    const { buscador } = crear()
    buscador.elegir({ value: { id: 'pravia', label: 'Pravia', description: 'Pravia', source: 'station' } })
    buscador.consulta.value = 'Pravia'
    await nextTick()
    expect(buscador.stationId.value).toBe('pravia')
  })
})

describe('el texto vale aunque no se elija sugerencia', () => {
  it('mucha gente escribe la dirección y pulsa buscar', () => {
    const { buscador } = crear()
    buscador.consulta.value = '  Calle Uría 12, Oviedo  '
    expect(buscador.texto.value).toBe('Calle Uría 12, Oviedo')
  })

  it('y si PrimeVue mete el objeto de la sugerencia, se lee de dentro', () => {
    const { buscador } = crear()
    buscador.consulta.value = { description: 'Calle Uría, Oviedo', label: 'Calle Uría' }
    expect(buscador.texto.value).toBe('Calle Uría, Oviedo')
  })
})
