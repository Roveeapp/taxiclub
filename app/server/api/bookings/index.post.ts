export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const user = event.context.user

  const db = useDb()

  const { data: booking, error: insertError } = await (db
    .from('bookings') as Record<string, any>)
    .insert({
      client_id: user?.id || null,
      guest_name: user ? null : body.guestName,
      guest_email: user ? null : body.guestEmail,
      guest_phone: user ? null : body.guestPhone,
      origin_station_id: body.originStationId,
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

  return booking
})
