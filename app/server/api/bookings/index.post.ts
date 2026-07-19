export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const user = event.context.user

  const db = useDb()

  if (!body.originStationId && !body.originAddress) {
    throw createError({ statusCode: 400, message: 'Falta el origen de la reserva' })
  }

  // Detectar si el destino en texto libre es en realidad una parada
  // registrada (habilita tarifas fijas y reglas de asignación por parada)
  if (!body.destinationStationId && body.destinationAddress) {
    try {
      const { data: allStations } = await db.from('stations').select('id, name').eq('is_active', true)
      const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
      const dest = norm(String(body.destinationAddress))
      const match = ((allStations || []) as Array<{ id: string, name: string }>)
        .find(s => dest.includes(norm(s.name)))
      if (match) body.destinationStationId = match.id
    } catch { /* opcional */ }
  }

  // Geocodificar el destino si no llegan coordenadas (para mapa y análisis)
  if (!body.destinationLat && body.destinationAddress) {
    try {
      const coords = await geocodeAddress(body.destinationAddress)
      if (coords) {
        body.destinationLat = coords.lat
        body.destinationLng = coords.lng
      }
    } catch { /* best-effort */ }
  }

  // Geocodificar el origen libre (para las zonas de los conductores y el mapa)
  if (!body.originLat && !body.originStationId && body.originAddress) {
    try {
      const coords = await geocodeAddress(body.originAddress)
      if (coords) {
        body.originLat = coords.lat
        body.originLng = coords.lng
      }
    } catch { /* best-effort */ }
  }

  // Resolver accesorios seleccionados a flags de la reserva
  const flags = await resolveAccessoryFlags(body.accessoryIds)
  body.needsChildSeat = body.needsChildSeat || flags.needsChildSeat
  body.needsPetFriendly = body.needsPetFriendly || flags.needsPetFriendly
  body.needsAccessible = body.needsAccessible || flags.needsAccessible
  body.needsLargeVehicle = body.needsLargeVehicle || flags.needsLargeVehicle

  const { data: booking, error: insertError } = await (db
    .from('bookings') as Record<string, any>)
    .insert({
      client_id: user?.id || null,
      guest_name: user ? null : body.guestName,
      guest_email: user ? null : body.guestEmail,
      guest_phone: user ? null : body.guestPhone,
      origin_station_id: body.originStationId || null,
      origin_address: body.originAddress || null,
      origin_lat: body.originLat || null,
      origin_lng: body.originLng || null,
      destination_address: body.destinationAddress,
      destination_lat: body.destinationLat || null,
      destination_lng: body.destinationLng || null,
      destination_station_id: body.destinationStationId || null,
      pickup_at: body.pickupAt,
      passengers: body.passengers,
      luggage_big: body.luggageBig,
      luggage_hand: body.luggageHand,
      needs_child_seat: body.needsChildSeat || false,
      needs_pet_friendly: body.needsPetFriendly || false,
      needs_accessible: body.needsAccessible || false,
      needs_large_vehicle: body.needsLargeVehicle || false,
      base_price: body.basePrice,
      total_price: body.totalPrice,
      status: 'pending',
      stripe_payment_intent_id: body.stripePaymentIntentId,
    })
    .select()
    .single()

  if (insertError || !booking) {
    throw createError({ statusCode: 500, message: insertError?.message || 'Failed to create booking' })
  }

  // Email de "reserva recibida" al cliente/invitado (best-effort)
  notifyBookingCreated(booking).catch((e: unknown) => {
    console.error('[Notify] Error enviando email de reserva creada:', e)
  })

  try {
    const driver = await assignDriver(body)
    await (db.from('booking_assignments') as Record<string, any>).insert({
      booking_id: (booking as Record<string, any>).id,
      driver_id: driver.id,
    })
    await (db
      .from('drivers') as Record<string, any>)
      .update({ last_assigned_at: new Date().toISOString() })
      .eq('id', driver.id)
    await notifyDriver(driver.id as string, booking)
  } catch {
    await notifyAdminNoDrivers((booking as Record<string, any>).id as string)
  }

  // A los invitados les devolvemos el token de acceso para su enlace
  const isGuest = !user?.id
  return {
    ...(booking as Record<string, any>),
    guest_token: isGuest ? signBookingToken((booking as Record<string, any>).id as string) : undefined,
  }
})
