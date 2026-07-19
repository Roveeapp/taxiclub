export async function getSystemConfig(): Promise<Record<string, any>> {
  const db = useDb()
  const { data: rows } = await db.from('system_config').select('key, value')
  const config: Record<string, any> = {}
  for (const row of (rows || []) as any[]) {
    config[row.key as string] = row.value
  }
  return config
}

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
      return {
        lat: parseFloat(first.lat),
        lng: parseFloat(first.lon),
      }
    }
    return null
  } catch (e) {
    console.error('Geocoding error:', e)
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

/**
 * Precio estimado por distancia cuando no existe tarifa fija de ruta.
 * Usa base_fare + km × price_per_km de system_config.
 * Devuelve null si no se puede geocodificar el destino.
 */
export async function estimateDistancePrice(
  originStationId: string | null,
  destinationText: string,
  originAddress?: string,
  perKmOverride?: number | null,
): Promise<{ price: number, distanceKm: number } | null> {
  if (!destinationText) return null
  const db = useDb()

  // Origen: coordenadas de la parada, o geocodificación del texto libre
  let origin: { lat: number, lng: number } | null = null
  if (originStationId) {
    const { data: station } = await db
      .from('stations')
      .select('lat, lng')
      .eq('id', originStationId)
      .single()
    const s = station as { lat: number | null, lng: number | null } | null
    if (s?.lat && s?.lng) origin = { lat: Number(s.lat), lng: Number(s.lng) }
  }
  if (!origin && originAddress) {
    origin = await geocodeAddress(originAddress)
  }
  if (!origin) return null

  const dest = await geocodeAddress(destinationText)
  if (!dest) return null

  const distanceKm = await getRouteDistanceKm(origin.lat, origin.lng, dest.lat, dest.lng)

  const config = await getSystemConfig()
  const price = computeFare({
    baseFare: Number(config.base_fare ?? 4),
    // La tarifa propia del conductor asignado prevalece sobre la global
    perKm: perKmOverride && perKmOverride > 0 ? Number(perKmOverride) : Number(config.price_per_km ?? 1.2),
    minFare: Number(config.min_fare ?? 10),
    distanceKm,
  })

  return { price, distanceKm: Math.round(distanceKm * 10) / 10 }
}

/**
 * "Peek" de asignación: averigua qué conductor recibiría esta reserva
 * (misma lógica que la asignación real, sin comprometer nada) y devuelve
 * su tarifa €/km personalizada si la tiene.
 */
export async function peekAssignedDriverRate(params: {
  originStationId?: string | null
  destinationStationId?: string | null
  passengers?: number
  luggageBig?: number
  luggageHand?: number
  needsChildSeat?: boolean
  needsPetFriendly?: boolean
  needsAccessible?: boolean
  needsLargeVehicle?: boolean
  pickupAt?: string | null
  destLat?: number | null
  destLng?: number | null
  originLat?: number | null
  originLng?: number | null
}): Promise<{ driverId: string, perKm: number | null, fixedPrice: number | null } | null> {
  if (!params.pickupAt) return null
  const db = useDb()

  try {
    const { data: result } = await (db.rpc as any)('get_driver_for_assignment', {
      p_origin_station_id: params.originStationId || null,
      p_destination_station_id: params.destinationStationId || null,
      p_passengers: params.passengers ?? 1,
      p_luggage_big: params.luggageBig ?? 0,
      p_luggage_hand: params.luggageHand ?? 0,
      p_needs_child_seat: params.needsChildSeat || false,
      p_needs_pet_friendly: params.needsPetFriendly || false,
      p_needs_accessible: params.needsAccessible || false,
      p_needs_large_vehicle: params.needsLargeVehicle || false,
      p_pickup_at: params.pickupAt,
      p_dest_lat: params.destLat ?? null,
      p_dest_lng: params.destLng ?? null,
      p_origin_lat: params.originLat ?? null,
      p_origin_lng: params.originLng ?? null,
    })

    const driverId = (result as any[])?.[0]?.id as string | undefined
    if (!driverId) return null

    const { data: driver } = await db
      .from('drivers')
      .select('custom_price_per_km')
      .eq('id', driverId)
      .single()

    const perKmRaw = (driver as any)?.custom_price_per_km
    const perKm = perKmRaw !== null && perKmRaw !== undefined ? Number(perKmRaw) : null

    // ── Precio fijo de trayecto (PRIORIDAD ABSOLUTA) ──
    // Busca rutas fijas del conductor que coincidan con este viaje.
    // 1) Match exacto por station_id (si la reserva tiene paradas)
    // 2) Match por proximidad de coordenadas (< 3 km)
    let fixedPrice: number | null = null
    try {
      const { data: routes } = await db
        .from('driver_fixed_routes')
        .select('price, origin_station_id, dest_station_id, origin_lat, origin_lng, dest_lat, dest_lng')
        .eq('driver_id', driverId)

      for (const r of (routes || []) as any[]) {
        // Comprobar origen
        let originMatch = false
        if (r.origin_station_id && params.originStationId && r.origin_station_id === params.originStationId) {
          originMatch = true
        } else if (r.origin_lat && r.origin_lng && params.originLat && params.originLng) {
          const dist = await calculateDistance(Number(r.origin_lat), Number(r.origin_lng), params.originLat, params.originLng)
          if (dist < 3) originMatch = true
        }
        if (!originMatch) continue

        // Comprobar destino
        let destMatch = false
        if (r.dest_station_id && params.destinationStationId && r.dest_station_id === params.destinationStationId) {
          destMatch = true
        } else if (r.dest_lat && r.dest_lng && params.destLat && params.destLng) {
          const dist = await calculateDistance(Number(r.dest_lat), Number(r.dest_lng), params.destLat, params.destLng)
          if (dist < 3) destMatch = true
        }

        if (destMatch) {
          return { driverId, perKm, fixedPrice: Number(r.price) }
        }
      }
    } catch { /* tabla aún sin migrar */ }

    // ── Anillos de precio fijo del conductor desde la parada de origen ──
    if (params.originStationId && params.destLat && params.destLng) {
      try {
        const { data: station } = await db
          .from('stations')
          .select('lat, lng')
          .eq('id', params.originStationId)
          .single()
        const s = station as { lat: number | null, lng: number | null } | null

        if (s?.lat && s?.lng) {
          const distKm = await calculateDistance(Number(s.lat), Number(s.lng), params.destLat, params.destLng)
          const { data: zones } = await db
            .from('driver_station_zones')
            .select('radius_from_km, radius_to_km, mode, fixed_price')
            .eq('driver_id', driverId)
            .eq('station_id', params.originStationId)
            .eq('mode', 'fixed_price')

          for (const z of (zones || []) as any[]) {
            if (distKm >= Number(z.radius_from_km) && distKm < Number(z.radius_to_km) && z.fixed_price) {
              fixedPrice = Number(z.fixed_price)
              break
            }
          }
        }
      } catch { /* zonas aún sin migrar */ }
    }

    return { driverId, perKm, fixedPrice }
  } catch (e) {
    console.error('[Pricing] Error en peek de asignación:', e)
    return null
  }
}

/**
 * Cálculo puro de tarifa por distancia (testeado en tests/unit/pricing.spec.ts).
 * Redondea a 0,50 € para precios "limpios" y aplica tarifa mínima.
 */
export function computeFare(input: { baseFare: number, perKm: number, minFare: number, distanceKm: number }): number {
  const raw = input.baseFare + input.distanceKm * input.perKm
  return Math.max(input.minFare, Math.round(raw * 2) / 2)
}

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
