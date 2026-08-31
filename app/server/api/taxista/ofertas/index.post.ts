/**
 * Publica una oferta de retorno.
 *
 * El precio base se calculaba como `const basePrice = 25`, igual para toda
 * oferta y sin relación con la distancia ni con la tarifa del conductor. Eso
 * hacía que el descuento porcentual —lo único que el taxista elige— se aplicara
 * sobre una cifra inventada: un 40 % de descuento sobre 25 € cuando el viaje
 * real vale 60 € no es un descuento, es un precio equivocado.
 *
 * Ahora usa el mismo motor de precios que una reserva normal, así que la base es
 * la que corresponde al trayecto y a la tarifa de quien lo ofrece.
 */
export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  const body = await readValidated(event, crearOfertaSchema)

  const quote = await quoteBooking({
    originAddress: body.originAddress,
    originLat: body.originLat ?? null,
    originLng: body.originLng ?? null,
    destinationStationId: body.destinationStationId,
    passengers: body.maxPassengers ?? 4,
    // La tarifa del propio conductor se aplica al ser él quien publica
    pickupAt: body.availableFrom,
  })

  const descuento = body.discountPct ?? 0
  const basePrice = quote.basePrice
  const finalPrice = Math.round(basePrice * (1 - descuento / 100) * 100) / 100

  const { data: offer, error } = await writeTable('return_offers')
    .insert({
      driver_id: user.id,
      origin_booking_id: body.originBookingId || null,
      origin_address: body.originAddress,
      origin_lat: body.originLat ?? quote.originCoords?.lat ?? null,
      origin_lng: body.originLng ?? quote.originCoords?.lng ?? null,
      destination_station_id: body.destinationStationId,
      available_from: body.availableFrom,
      available_until: body.availableUntil,
      max_passengers: body.maxPassengers || 4,
      discount_pct: descuento,
      base_price: basePrice,
      final_price: finalPrice,
      status: 'active',
    })
    .select()
    .single()

  if (error || !offer) {
    throw createError({ statusCode: 500, message: error?.message || 'No se pudo publicar la oferta' })
  }

  return offer
})
