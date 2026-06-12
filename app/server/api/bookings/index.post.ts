export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const user = requireAuth(event)

  const db = useDb()

  const { data: booking, error: insertError } = await db
    .from('bookings')
    .insert({
      client_id: user.id,
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
    } as any)
    .select()
    .single()

  if (insertError || !booking) {
    throw createError({ statusCode: 500, message: insertError?.message || 'Failed to create booking' })
  }

  try {
    const driver = await assignDriver(body)
    await db.from('booking_assignments').insert({
      booking_id: (booking as any).id,
      driver_id: driver.id,
    } as any)
    await db
      .from('drivers')
      .update({ last_assigned_at: new Date().toISOString() } as any)
      .eq('id', driver.id)
    await notifyDriver(driver.id as string, booking)
  } catch {
    await notifyAdminNoDrivers((booking as any).id as string)
  }

  return booking
})
