/**
 * Decide si el destino de una reserva es una parada registrada.
 *
 * Importa más de lo que parece: atar una reserva a una parada activa el precio
 * fijo del conductor para ese trayecto, que en `pricing.ts` tiene PRIORIDAD
 * ABSOLUTA sobre el cálculo por kilómetros. Una parada mal deducida no da un
 * precio aproximado: da el precio de otro viaje.
 *
 * Lo que había antes era una sola línea en la ruta de reservas:
 *
 *   const match = allStations.find(s => dest.includes(norm(s.name)))
 *
 * y se equivocaba en las dos direcciones a la vez, con las cinco paradas reales
 * del club:
 *
 *   «Calle Uría, Pravia»  → contiene «pravia» → se ata a la parada de Pravia,
 *                           y el cliente paga la tarifa fija de la parada por
 *                           un viaje que no sale de ella.
 *   «Oviedo, Asturias»    → la parada se llama «Oviedo — RENFE», con raya, así
 *                           que NO contiene su nombre y no se detecta aunque el
 *                           destino sea de verdad la estación.
 *
 * Es decir, ataba lo que no debía y dejaba pasar lo que sí. Tres de las cinco
 * paradas llevan raya en el nombre, así que el segundo caso era el habitual.
 */

/** Quita acentos, mayúsculas y signos, para comparar nombres de sitios. */
function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    // La raya de «Oviedo — RENFE» y el guion se tratan como separadores
    .replace(/[—–-]/g, ' ')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Radio dentro del cual damos por hecho que el destino ES la parada. */
const RADIO_PARADA_KM = 0.4

interface ParadaCandidata {
  id: string
  name: string
  lat: number | null
  lng: number | null
  is_active: boolean | null
}

/** Distancia en kilómetros entre dos coordenadas (Haversine). */
function distanciaKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export type OrigenDeParada = 'declarada' | 'coordenadas' | 'nombre' | null

export interface ResultadoParada {
  stationId: string | null
  /** Cómo se decidió, para poder registrarlo y auditar un precio después. */
  origen: OrigenDeParada
}

/**
 * Función pura, para poder probar las reglas sin base de datos.
 *
 * Orden deliberado: lo que el cliente eligió explícitamente, luego las
 * coordenadas, y el nombre en último lugar y solo con coincidencia exacta.
 */
export function resolverParadaDestino(
  paradas: ParadaCandidata[],
  entrada: {
    destinationStationId?: string | null
    destinationAddress?: string | null
    destinationLat?: number | null
    destinationLng?: number | null
  },
): ResultadoParada {
  const activas = paradas.filter(p => p.is_active !== false)

  // 1) El cliente eligió la parada en el desplegable. Se comprueba que exista y
  //    esté activa: un id inventado en el cuerpo de la petición no vale.
  if (entrada.destinationStationId) {
    const declarada = activas.find(p => p.id === entrada.destinationStationId)
    if (declarada) return { stationId: declarada.id, origen: 'declarada' }
    return { stationId: null, origen: null }
  }

  // 2) Coordenadas: es la señal fiable, y es la que el buscador ya tenía y
  //    tiraba a la basura. Mismo criterio que las rutas fijas de pricing.ts,
  //    pero con radio corto: aquí no queremos «cerca de», queremos «es».
  const { destinationLat: lat, destinationLng: lng } = entrada
  if (typeof lat === 'number' && typeof lng === 'number' && Number.isFinite(lat) && Number.isFinite(lng)) {
    let mejor: { id: string, km: number } | null = null
    for (const p of activas) {
      if (p.lat == null || p.lng == null) continue
      const km = distanciaKm(lat, lng, Number(p.lat), Number(p.lng))
      if (km <= RADIO_PARADA_KM && (!mejor || km < mejor.km)) mejor = { id: p.id, km }
    }
    // La más cercana, no la primera de la lista: con dos paradas en la misma
    // ciudad el orden de la tabla no debería decidir el precio.
    if (mejor) return { stationId: mejor.id, origen: 'coordenadas' }
    // Había coordenadas y ninguna parada cae dentro: eso es una respuesta, no
    // una falta de información. No se sigue al cotejo por nombre.
    return { stationId: null, origen: null }
  }

  // 3) Nombre, solo si no hay nada mejor. Coincidencia EXACTA contra el primer
  //    tramo de la dirección, que es donde va el sitio; nunca `includes` sobre
  //    la cadena entera, que es lo que ataba «Calle Uría, Pravia» a Pravia.
  const direccion = (entrada.destinationAddress || '').trim()
  if (!direccion) return { stationId: null, origen: null }

  const tramos = direccion.split(',').map(t => normalizar(t)).filter(Boolean)
  // Se admiten el primer tramo y los dos primeros juntos: «Aeropuerto de
  // Asturias, Santiago del Monte» y «Gijón, FEVE» deben reconocerse.
  const candidatos = new Set<string>()
  if (tramos[0]) candidatos.add(tramos[0])
  if (tramos[0] && tramos[1]) candidatos.add(`${tramos[0]} ${tramos[1]}`)
  candidatos.add(normalizar(direccion))

  for (const p of activas) {
    if (candidatos.has(normalizar(p.name))) return { stationId: p.id, origen: 'nombre' }
  }
  return { stationId: null, origen: null }
}

/**
 * La misma decisión, leyendo las paradas de la base de datos.
 *
 * La usan la ruta de reservas y la de presupuesto, para que el precio que se
 * muestra y el que se guarda salgan de la misma regla. Antes solo la reserva
 * hacía el cotejo, así que el presupuesto podía enseñar un importe por
 * kilómetros y la reserva guardar la tarifa fija de una parada.
 */
export async function resolveDestinationStation(entrada: {
  destinationStationId?: string | null
  destinationAddress?: string | null
  destinationLat?: number | null
  destinationLng?: number | null
}): Promise<ResultadoParada> {
  const db = useDb()
  const { data, error } = await db
    .from('stations')
    .select('id, name, lat, lng, is_active')
    .eq('is_active', true)

  if (error) {
    // Sin paradas no se puede decidir, y equivocarse aquí cambia el precio: es
    // mejor cotizar por kilómetros que atar la reserva a la parada equivocada.
    console.error('[Paradas] No se pudieron leer las paradas para cotejar el destino:', error.message)
    return { stationId: null, origen: null }
  }

  const resultado = resolverParadaDestino((data || []) as ParadaCandidata[], entrada)

  if (resultado.origen === 'nombre') {
    // El cotejo por nombre es el menos fiable de los tres. Queda registrado
    // para poder revisar después por qué una reserva llevó tarifa de parada.
    console.info(
      `[Paradas] Destino «${entrada.destinationAddress}» atado a la parada `
      + `${resultado.stationId} por coincidencia de nombre, sin coordenadas`,
    )
  }
  return resultado
}
