/**
 * Reserva una oferta de Última Hora:
 * - La oferta queda 'booked' y pre-asignada al taxista que la publicó.
 * - Se crea la reserva ya CONFIRMADA con la matrícula del taxista.
 * - El cliente solo pre-autoriza la señal (10%); el resto al taxista.
 */
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'Missing id' })
  const body = await readValidated(event, reservarOfertaSchema)
  const user = event.context.user
  const db = useDb()

  if (!user?.id && (!body.guestName || !body.guestEmail || !body.guestPhone)) {
    throw createError({ statusCode: 400, message: 'Faltan los datos del pasajero' })
  }

  // 1. Oferta válida (y bloqueo optimista del estado)
  const { data: offer, error: findError } = await db
    .from('return_offers')
    .select('*')
    .eq('id', id)
    .single()

  if (findError || !offer) throw createError({ statusCode: 404, message: 'Oferta no encontrada' })
  const o = offer as Record<string, any>

  if (o.status !== 'active' || new Date(o.available_until).getTime() < Date.now()) {
    throw createError({ statusCode: 400, message: 'Esta oferta ya no está disponible' })
  }

  const finalPrice = Number(o.final_price)
  const deposit = Math.round(finalPrice * 10) / 100

  // 2. Datos del taxista para confirmar directamente (matrícula + teléfono)
  const { data: vehicle } = await db
    .from('vehicles')
    .select('plate')
    .eq('driver_id', o.driver_id)
    .eq('is_active', true)
    .limit(1)
    .maybeSingle()

  const { data: driverUser } = await db
    .from('users')
    .select('phone')
    .eq('id', o.driver_id)
    .single()

  // 3. Crear la reserva confirmada
  const { data: booking, error: insertError } = await writeTable('bookings')
    .insert({
      client_id: user?.id || null,
      guest_name: user ? null : body.guestName,
      guest_email: user ? null : body.guestEmail,
      guest_phone: user ? null : body.guestPhone,
      origin_station_id: null,
      origin_address: o.origin_address,
      destination_station_id: o.destination_station_id,
      destination_address: body.destinationName || 'Parada de destino',
      pickup_at: o.available_from,
      passengers: Math.min(Number(body.passengers || 1), Number(o.max_passengers || 4)),
      luggage_big: 0,
      luggage_hand: 0,
      base_price: Number(o.base_price),
      total_price: finalPrice,
      deposit_amount: deposit,
      offer_id: id,
      status: 'confirmed',
      stripe_payment_intent_id: body.stripePaymentIntentId || null,
    })
    .select()
    .single()

  if (insertError || !booking) {
    throw createError({ statusCode: 500, message: insertError?.message || 'No se pudo crear la reserva' })
  }
  const b = booking as Record<string, any>

  // 4. Asignación pre-confirmada al taxista de la oferta
  await writeTable('booking_assignments').insert({
    booking_id: b.id,
    driver_id: o.driver_id,
    confirmed_at: new Date().toISOString(),
    confirmed_plate: (vehicle as any)?.plate || null,
    confirmed_phone: (driverUser as any)?.phone || null,
  })

  // 5. Marcar la oferta como reservada (solo si sigue activa — evita carreras)
  const { data: updatedOffer } = await writeTable('return_offers')
    .update({ status: 'booked', booked_by_id: b.id })
    .eq('id', id)
    .eq('status', 'active')
    .select('id')

  if (!updatedOffer || (updatedOffer as any[]).length === 0) {
    // Alguien la reservó justo antes: revertir
    await writeTable('bookings').update({ status: 'cancelled', cancellation_reason: 'Oferta ya reservada' }).eq('id', b.id)
    throw createError({ statusCode: 409, message: 'Otra persona acaba de reservar esta oferta' })
  }

  // 6. Avisar al taxista (best-effort)
  notifyDriver(o.driver_id as string, {
    ...b,
    origin_station_name: b.origin_address,
  }).catch((e: unknown) => console.error('[Notify] oferta reservada:', e))

  // Email al cliente (best-effort)
  notifyBookingCreated(b).catch((e: unknown) => console.error('[Notify] reserva de oferta:', e))

  const isGuest = !user?.id
  return {
    ...b,
    guest_token: isGuest ? signBookingToken(b.id as string) : undefined,
  }
})
