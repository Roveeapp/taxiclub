/**
 * Tarifa del conductor que recibiría una reserva.
 *
 * Consulta la asignación SIN comprometerla —de ahí el «peek»— para saber con
 * qué €/km y con qué rutas fijas hay que cotizar: la tarifa del conductor
 * concreto manda sobre la global, y su precio fijo de trayecto manda sobre
 * todo. Eran 136 líneas dentro de pricing.ts, y no son sobre precios en
 * general: son sobre el conductor.
 *
 * Nitro auto-importa app/server/services, así que no cambia nada para quien la
 * llama.
 */

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
    const { data: result } = await callRpc<Array<Record<string, unknown>>>('get_driver_for_assignment', {
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

    const driverId = (result as Array<Record<string, unknown>>)?.[0]?.id as string | undefined
    if (!driverId) return null

    const { data: driver } = await db
      .from('drivers')
      .select('custom_price_per_km')
      .eq('id', driverId)
      .single()

    const perKmRaw = (driver as { custom_price_per_km?: number | string | null } | null)?.custom_price_per_km
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

      for (const r of (routes || []) as Array<Record<string, unknown>>) {
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
    } catch (e) {
      // El comentario original decía «tabla aún sin migrar», pero
      // driver_fixed_routes existe desde la migración 031: este catch ya no
      // protege de nada y sí oculta un fallo que CAMBIA EL PRECIO, porque se
      // pierde la ruta fija del conductor y se cae a la estimación.
      console.error('[Pricing] No se pudieron leer las rutas fijas del conductor:', (e as Error)?.message)
    }

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

          for (const z of (zones || []) as Array<Record<string, unknown>>) {
            if (distKm >= Number(z.radius_from_km) && distKm < Number(z.radius_to_km) && z.fixed_price) {
              fixedPrice = Number(z.fixed_price)
              break
            }
          }
        }
      } catch (e) {
        // driver_station_zones existe desde la migración 028. Perder esto
        // significa ignorar los anillos de precio fijo del conductor.
        console.error('[Pricing] No se pudieron leer las zonas del conductor:', (e as Error)?.message)
      }
    }

    return { driverId, perKm, fixedPrice }
  } catch (e) {
    console.error('[Pricing] Error en peek de asignación:', e)
    return null
  }
}
