export default defineEventHandler(async (event) => {
  const body = await readValidated(event, presupuestoSchema)

  if (!body?.originStationId && !body?.originAddress) {
    throw createError({ statusCode: 400, message: 'Falta el origen (originStationId u originAddress)' })
  }

  // La parada de destino se resuelve con la MISMA regla que en la reserva.
  // Antes solo la reserva cotejaba el destino con las paradas, así que el
  // presupuesto cotizaba por kilómetros y la reserva podía guardar la tarifa
  // fija de una parada: dos importes distintos para el mismo viaje, y el
  // cliente veía el primero y pagaba el segundo.
  const { stationId: destinationStationId } = await resolveDestinationStation({
    destinationStationId: body.destinationStationId,
    destinationAddress: body.destination,
    destinationLat: body.destinationLat,
    destinationLng: body.destinationLng,
  })

  // El cálculo vive en services/pricing.ts, compartido con la creación de la
  // reserva, para que el presupuesto que ve el cliente y el precio que se
  // guarda no puedan divergir.
  const quote = await quoteBooking({
    originStationId: body.originStationId,
    originAddress: body.originAddress,
    destination: body.destination,
    destinationStationId,
    accessoryIds: body.accessoryIds,
    needsChildSeat: body.needsChildSeat,
    needsPetFriendly: body.needsPetFriendly,
    needsAccessible: body.needsAccessible,
    needsLargeVehicle: body.needsLargeVehicle,
    passengers: body.passengers,
    luggageBig: body.luggageBig,
    luggageHand: body.luggageHand,
    pickupAt: body.pickupAt,
    originLat: body.originLat ?? null,
    originLng: body.originLng ?? null,
    destinationLat: body.destinationLat ?? null,
    destinationLng: body.destinationLng ?? null,
  })

  const result: Record<string, unknown> = {
    basePrice: quote.basePrice,
    extras: quote.extras,
    totalPrice: quote.totalPrice,
    needsChildSeat: quote.needsChildSeat,
    needsPetFriendly: quote.needsPetFriendly,
    needsAccessible: quote.needsAccessible,
    needsLargeVehicle: quote.needsLargeVehicle,
  }

  // Pre-autorización Stripe (captura manual: el cargo se hace al completar el viaje)
  if (body.createIntent) {
    if (await arePaymentsEnabled()) {
      try {
        const stripe = useStripe()
        const intent = await stripe.paymentIntents.create({
          amount: Math.round(quote.totalPrice * 100),
          currency: 'eur',
          capture_method: 'manual',
          automatic_payment_methods: { enabled: true, allow_redirects: 'never' },
          metadata: {
            origin: body.originStationId || body.originAddress || '',
            destination: body.destination || destinationStationId || '',
          },
        })
        result.clientSecret = intent.client_secret
        result.paymentIntentId = intent.id
      } catch (e) {
        console.error('Stripe create intent error:', e)
        // No bloqueamos la reserva: el front hará fallback sin pasarela
      }
    }
  }

  return result
})
