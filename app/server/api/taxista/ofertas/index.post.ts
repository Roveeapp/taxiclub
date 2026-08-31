export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  const body = await readValidated(event, crearOfertaSchema)

  const basePrice = 25
  const finalPrice = basePrice * (1 - (body.discountPct || 0) / 100)

  const { data: offer, error } = await writeTable('return_offers')
    .insert({
      driver_id: user.id,
      origin_booking_id: body.originBookingId || null,
      origin_address: body.originAddress,
      origin_lat: body.originLat || null,
      origin_lng: body.originLng || null,
      destination_station_id: body.destinationStationId,
      available_from: body.availableFrom,
      available_until: body.availableUntil,
      max_passengers: body.maxPassengers || 4,
      discount_pct: body.discountPct || 0,
      base_price: basePrice,
      final_price: finalPrice,
      status: 'active',
    })
    .select()
    .single()

  if (error || !offer) {
    throw createError({ statusCode: 500, message: error?.message || 'Failed to create offer' })
  }

  return offer
})
