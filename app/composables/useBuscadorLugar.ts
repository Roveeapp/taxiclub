/**
 * Un campo de búsqueda de lugar: paradas del club primero, direcciones después.
 *
 * POR QUÉ EXISTE
 *   El formulario de reserva tenía dos bloques casi idénticos, uno para el
 *   origen y otro para el destino, y habían divergido: el de origen ofrecía las
 *   paradas registradas y guardaba el id elegido; el de destino no las ofrecía.
 *   El cliente no tenía forma de decir «voy a la estación de Oviedo», así que el
 *   servidor lo adivinaba con un `includes` sobre el texto libre y se
 *   equivocaba en las dos direcciones —ataba «Calle Uría, Pravia» a la parada de
 *   Pravia y no reconocía «Oviedo — RENFE» por la raya del nombre—. Eso decidía
 *   la tarifa fija del trayecto.
 *
 *   Los dos bloques venían del mismo original, y uno recibió mejoras que el
 *   otro no. Con una sola implementación esa divergencia no puede repetirse: es
 *   el arreglo estructural del fallo, no solo el arreglo del síntoma.
 *
 * QUÉ DEVUELVE
 *   Además del texto, el `stationId` cuando el usuario elige una parada y las
 *   coordenadas que la sugerencia ya traía. Las dos cosas se tiraban a la
 *   basura, y son justo las que el servidor necesita para no adivinar.
 */

export interface Parada {
  id: string
  name: string
}

export interface SugerenciaLugar {
  id: string
  label: string
  description: string
  source: string
  lat?: number
  lng?: number
}

interface Opciones {
  /** Paradas del club, para ofrecerlas antes que las direcciones. */
  paradas: () => Parada[]
  /** Espera antes de consultar, para no llamar en cada tecla. */
  esperaMs?: number
}

export function useBuscadorLugar(opciones: Opciones) {
  const espera = opciones.esperaMs ?? 300

  /** Lo que hay escrito. PrimeVue mete un objeto cuando se elige sugerencia. */
  const consulta = ref<string | { description?: string, label?: string }>('')
  const sugerencias = ref<SugerenciaLugar[]>([])
  /** Solo si el usuario eligió una parada registrada del desplegable. */
  const stationId = ref('')
  const coords = ref<{ lat: number, lng: number } | null>(null)

  let debounce: ReturnType<typeof setTimeout> | null = null

  /**
   * El texto vale aunque no se elija sugerencia: mucha gente escribe la
   * dirección y pulsa buscar sin desplegar nada.
   */
  const texto = computed(() => {
    const q = consulta.value
    if (typeof q === 'string') return q.trim()
    return (q?.description || q?.label || '').trim()
  })

  function paradasQueCoinciden(termino: string): SugerenciaLugar[] {
    const t = termino.toLowerCase()
    return opciones.paradas()
      .filter(s => s.name.toLowerCase().includes(t))
      .map(s => ({ id: s.id, label: s.name, description: s.name, source: 'station' }))
  }

  async function buscar(event: { query: string }) {
    if (debounce) clearTimeout(debounce)
    debounce = setTimeout(async () => {
      const propias = paradasQueCoinciden(event.query)

      // Con menos de dos caracteres no merece la pena consultar direcciones,
      // pero las paradas del club sí se pueden ofrecer ya
      if (event.query.length < 2) {
        sugerencias.value = propias
        return
      }
      try {
        const data = await $fetch<SugerenciaLugar[]>(
          `/api/addresses/search?q=${encodeURIComponent(event.query)}`,
        )
        sugerencias.value = [...propias, ...(data || [])]
      } catch {
        // Sin direcciones, al menos quedan las paradas
        sugerencias.value = propias
      }
    }, espera)
  }

  /**
   * El texto al que corresponden `stationId` y `coords`.
   *
   * Hace falta guardarlo porque la comprobación obvia no funciona: el primer
   * intento comparaba el texto nuevo con el `computed` `texto`, que se deriva
   * del MISMO valor que acaba de cambiar, así que eran siempre iguales y la
   * invalidación no ocurría nunca. Lo cazó el test, no la lectura del código.
   *
   * Y la consecuencia era de dinero: elegir «Oviedo — RENFE» del desplegable
   * —que fija las coordenadas de la parada— y escribir después otra dirección
   * encima dejaba las coordenadas de la estación pegadas. El servidor las usa
   * para decidir que el destino ES la parada, así que el viaje se cotizaba con
   * la tarifa fija de la estación yendo a otro sitio.
   */
  let textoDeLaEleccion = ''

  function elegir(event: { value: SugerenciaLugar }) {
    const v = event.value
    const esParada = v.source === 'station'
    const escrito = esParada ? v.label : v.description
    consulta.value = escrito
    textoDeLaEleccion = escrito.trim()
    stationId.value = esParada ? v.id : ''
    coords.value = typeof v.lat === 'number' && typeof v.lng === 'number'
      ? { lat: v.lat, lng: v.lng }
      : null
    sugerencias.value = []
  }

  /**
   * Si se edita el texto después de elegir, la elección deja de valer: ni la
   * parada ni las coordenadas. Unas coordenadas equivocadas son peor que
   * ninguna, porque el servidor se las cree y cotiza el viaje con ellas.
   */
  watch(consulta, (q) => {
    if (typeof q !== 'string') return
    if (q.trim() === textoDeLaEleccion) return
    textoDeLaEleccion = ''
    stationId.value = ''
    coords.value = null
  })

  onScopeDispose(() => {
    if (debounce) clearTimeout(debounce)
  })

  return { consulta, sugerencias, stationId, coords, texto, buscar, elegir }
}
