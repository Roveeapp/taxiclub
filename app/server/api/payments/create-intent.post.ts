interface CreateIntentBody {
  originStationId?: string
  originAddress?: string
  destination?: string
  destinationStationId?: string
  passengers?: number
  luggageBig?: number
  luggageHand?: number
  accessoryIds?: string[]
  needsChildSeat?: boolean
  needsPetFriendly?: boolean
  needsAccessible?: boolean
  needsLargeVehicle?: boolean
  /** Fecha/hora de recogida ISO — permite calcular con la tarifa del conductor que recibirá la reserva */
  pickupAt?: string
  /** Si es true crea un PaymentIntent real en Stripe (pantalla de pago). Si no, solo devuelve el precio. */
  createIntent?: boolean
}

export default defineEventHandler(async (event) => {
  const body = await readBody<CreateIntentBody>(event)

  if (!body?.originStationId && !body?.originAddress) {
    throw createError({ statusCode: 400, message: 'Falta el origen (originStationId u originAddress)' })
  }

  // El cálculo vive en services/pricing.ts, compartido con la creación de la
  // reserva, para que el presupuesto que ve el cliente y el precio que se
  // guarda no puedan divergir.
  const quote = await quoteBooking({
    originStationId: body.originStationId,
    originAddress: body.originAddress,
    destination: body.destination,
    destinationStationId: body.destinationStationId,
    accessoryIds: body.accessoryIds,
    needsChildSeat: body.needsChildSeat,
    needsPetFriendly: body.needsPetFriendly,
    needsAccessible: body.needsAccessible,
    needsLargeVehicle: body.needsLargeVehicle,
    passengers: body.passengers,
    luggageBig: body.luggageBig,
    luggageHand: body.luggageHand,
    pickupAt: body.pickupAt,
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
    if (await isStripeConfigured()) {
      try {
        const stripe = useStripe()
        const intent = await stripe.paymentIntents.create({
          amount: Math.round(quote.totalPrice * 100),
          currency: 'eur',
          capture_method: 'manual',
          automatic_payment_methods: { enabled: true, allow_redirects: 'never' },
          metadata: {
            origin: body.originStationId || body.originAddress || '',
            destination: body.destination || body.destinationStationId || '',
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
