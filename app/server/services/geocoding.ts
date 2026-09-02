/**
 * Geocodificación y distancias.
 *
 * Estaba dentro de pricing.ts, que había crecido a 624 líneas mezclando tres
 * cosas: hablar con servicios externos, consultar la tarifa del conductor
 * asignado, y calcular el precio. Esto es lo primero, y tiene sus propios
 * modos de fallo —Nominatim contesta [] sin error, OSRM se cae— que conviene
 * poder leer sin el resto del cálculo alrededor.
 *
 * Nitro auto-importa app/server/services, así que quien usaba estas funciones
 * las sigue teniendo sin cambiar nada.
 */

/**
 * Traduce una dirección a coordenadas con Nominatim.
 *
 * El `catch` registraba el error, pero el caso frecuente NO es una excepción:
 * es que Nominatim conteste `[]`. Eso devolvía `null` sin dejar rastro, y el
 * presupuesto se caía al precio de último recurso sin que nadie lo supiera.
 * Comprobado contra el servicio real: «Estación de RENFE, Oviedo» y «Calle
 * Uría, Pravia» devuelven las dos una lista vacía, y ese viaje se cotizaba a
 * 25 € cuando el conductor tiene una tarifa fija de 45 € para él.
 *
 * Los dos desenlaces se distinguen ahora en el registro, porque piden cosas
 * distintas: «sin resultados» es una dirección que el cliente escribió y el
 * mapa no conoce; «falló la petición» es un problema de servicio o de cuota.
 */
export async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  const config = useRuntimeConfig()
  const nominatimUrl = config.nominatimUrl || 'https://nominatim.openstreetmap.org'

  try {
    const response = await $fetch<Array<{ lat: string; lon: string }>>(`${nominatimUrl}/search`, {
      params: {
        q: address,
        format: 'json',
        limit: 1,
        countrycodes: 'es',
      },
      headers: {
        'User-Agent': 'ClubTaxisAsturias/1.0',
      },
    })

    const first = response?.[0]
    if (first) {
      const lat = parseFloat(first.lat)
      const lng = parseFloat(first.lon)
      if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng }
      console.error(`[Geocoding] Nominatim devolvió coordenadas ilegibles para «${address}»:`, first)
      return null
    }
    console.warn(
      `[Geocoding] Sin resultados para «${address}». El precio se calculará sin `
      + 'distancia, y la asignación por zonas del conductor no podrá aplicarse.',
    )
    return null
  } catch (e) {
    console.error(`[Geocoding] Falló la consulta a Nominatim para «${address}»:`, (e as Error)?.message)
    return null
  }
}

/**
 * Distancia real por carretera entre dos puntos usando OSRM (público).
 * Fallback: distancia haversine × 1.3 (factor de sinuosidad).
 */
export async function getRouteDistanceKm(
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number,
): Promise<number> {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${originLng},${originLat};${destLng},${destLat}?overview=false`
    const res = await $fetch<{ routes?: Array<{ distance: number }> }>(url, { timeout: 5000 })
    const meters = res?.routes?.[0]?.distance
    if (meters && meters > 0) return meters / 1000
  } catch (e) {
    console.error('[OSRM] Error, usando haversine:', e)
  }
  const straight = await calculateDistance(originLat, originLng, destLat, destLng)
  return straight * 1.3
}

/** Distancia en línea recta entre dos coordenadas (Haversine), en km. */
export async function calculateDistance(
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number,
): Promise<number> {
  const R = 6371
  const dLat = (destLat - originLat) * Math.PI / 180
  const dLng = (destLng - originLng) * Math.PI / 180
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(originLat * Math.PI / 180) * Math.cos(destLat * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}
