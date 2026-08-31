interface BookingRow {
  id: string
  [column: string]: unknown
}

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const user = event.context.user

  const db = useDb()

  if (!body.originStationId && !body.originAddress) {
    throw createError({ statusCode: 400, message: 'Falta el origen de la reserva' })
  }

  // Antelación mínima: la valida el servidor, no solo el formulario
  await assertPickupWithinPolicy(body.pickupAt)

  const passengers = Number(body.passengers ?? 1)
  const luggageBig = Number(body.luggageBig ?? 0)
  const luggageHand = Number(body.luggageHand ?? 0)
  if (!Number.isInteger(passengers) || passengers < 1 || passengers > 8) {
    throw createError({ statusCode: 400, message: 'El número de pasajeros debe estar entre 1 y 8' })
  }
  if (!Number.isInteger(luggageBig) || luggageBig < 0 || luggageBig > 20
    || !Number.isInteger(luggageHand) || luggageHand < 0 || luggageHand > 20) {
    throw createError({ statusCode: 400, message: 'El equipaje indicado no es válido' })
  }
  if (!user && !body.guestName) {
    throw createError({ statusCode: 400, message: 'Falta el nombre de contacto' })
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
    } catch (e) {
      console.error('[Booking] No se pudo cotejar el destino con las paradas:', (e as Error)?.message)
    }
  }

  // Precio y extras: los calcula el servidor. Lo que envíe el cliente se
  // ignora — antes se guardaba tal cual y permitía reservar por un céntimo.
  const quote = await quoteBooking({
    originStationId: body.originStationId,
    originAddress: body.originAddress,
    destination: body.destinationAddress,
    destinationStationId: body.destinationStationId,
    accessoryIds: body.accessoryIds,
    needsChildSeat: body.needsChildSeat,
    needsPetFriendly: body.needsPetFriendly,
    needsAccessible: body.needsAccessible,
    needsLargeVehicle: body.needsLargeVehicle,
    passengers,
    luggageBig,
    luggageHand,
    pickupAt: body.pickupAt,
    originLat: body.originLat ?? null,
    originLng: body.originLng ?? null,
    destinationLat: body.destinationLat ?? null,
    destinationLng: body.destinationLng ?? null,
  })

  // Si el cliente mandó un precio y no coincide, lo dejamos registrado: puede
  // ser una tarifa que cambió entre pantallas, o un intento de manipulación.
  if (body.totalPrice != null && Math.abs(Number(body.totalPrice) - quote.totalPrice) > 0.01) {
    console.warn(
      `[Booking] Precio del cliente descartado: enviado=${body.totalPrice} ` +
      `calculado=${quote.totalPrice} (origen=${quote.source})`,
    )
  }

  // El pago, si viene, tiene que existir en Stripe y cuadrar con este importe
  let verifiedPaymentIntentId: string | null = null
  if (body.stripePaymentIntentId) {
    if (await isStripeConfigured()) {
      verifiedPaymentIntentId = await verifyPaymentIntentForBooking(
        String(body.stripePaymentIntentId),
        quote.totalPrice,
      )
    } else {
      console.warn('[Booking] Llega un payment intent pero Stripe no está configurado; se descarta')
    }
  }

  const { data: booking, error: insertError } = await writeTable('bookings')
    .insert({
      client_id: user?.id || null,
      guest_name: user ? null : body.guestName,
      guest_email: user ? null : body.guestEmail,
      guest_phone: user ? null : body.guestPhone,
      origin_station_id: body.originStationId || null,
      origin_address: body.originAddress || null,
      origin_lat: quote.originCoords?.lat ?? null,
      origin_lng: quote.originCoords?.lng ?? null,
      destination_address: body.destinationAddress,
      destination_lat: quote.destinationCoords?.lat ?? null,
      destination_lng: quote.destinationCoords?.lng ?? null,
      destination_station_id: body.destinationStationId || null,
      pickup_at: body.pickupAt,
      passengers,
      luggage_big: luggageBig,
      luggage_hand: luggageHand,
      needs_child_seat: quote.needsChildSeat,
      needs_pet_friendly: quote.needsPetFriendly,
      needs_accessible: quote.needsAccessible,
      needs_large_vehicle: quote.needsLargeVehicle,
      base_price: quote.basePrice,
      total_price: quote.totalPrice,
      status: 'pending',
      stripe_payment_intent_id: verifiedPaymentIntentId,
    })
    .select()
    .single<BookingRow>()

  if (insertError || !booking) {
    throw createError({ statusCode: 500, message: insertError?.message || 'Failed to create booking' })
  }

  // Email de "reserva recibida" al cliente/invitado (best-effort)
  notifyBookingCreated(booking).catch((e: unknown) => {
    console.error('[Notify] Error enviando email de reserva creada:', e)
  })

  // Asignación: distinguimos "no hay conductores" de un fallo real. Antes un
  // solo catch avisaba al admin de "sin conductores" ante cualquier excepción,
  // y el error original se perdía sin registrarse.
  const bookingId = booking.id
  try {
    const driver = await assignDriver(body)
    if (!driver) {
      await notifyAdminNoDrivers(bookingId)
    } else {
      await writeTable('booking_assignments').insert({
        booking_id: bookingId,
        driver_id: driver.id,
      })
      await writeTable('drivers')
        .update({ last_assigned_at: new Date().toISOString() })
        .eq('id', driver.id)
      await notifyDriver(driver.id, booking)
    }
  } catch (e) {
    console.error(`[Booking] Fallo asignando la reserva ${bookingId}:`, e)
    await notifyAdminNoDrivers(bookingId).catch(() => {})
  }

  // A los invitados les devolvemos el token de acceso para su enlace
  const isGuest = !user?.id
  return {
    ...booking,
    guest_token: isGuest ? signBookingToken(bookingId) : undefined,
  }
})
