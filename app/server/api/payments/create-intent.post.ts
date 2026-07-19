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

  // Resolver extras: acepta tanto flags directos como IDs de accesorios seleccionados
  const flags = await resolveAccessoryFlags(body.accessoryIds)
  const needsChildSeat = body.needsChildSeat || flags.needsChildSeat
  const needsPetFriendly = body.needsPetFriendly || flags.needsPetFriendly
  const needsAccessible = body.needsAccessible || flags.needsAccessible
  const needsLargeVehicle = body.needsLargeVehicle || flags.needsLargeVehicle

  // Coordenadas de destino y origen libre (para zonas del conductor)
  let destCoords: { lat: number, lng: number } | null = null
  if (body.destination) {
    try {
      destCoords = await geocodeAddress(body.destination)
    } catch { /* opcional */ }
  }
  let originCoords: { lat: number, lng: number } | null = null
  if (!body.originStationId && body.originAddress) {
    try {
      originCoords = await geocodeAddress(body.originAddress)
    } catch { /* opcional */ }
  }

  // Conductor que recibiría esta reserva (peek de asignación):
  // su €/km y sus anillos de precio fijo prevalecen sobre lo global
  let driverPerKm: number | null = null
  let driverFixedPrice: number | null = null
  if (body.pickupAt) {
    const peek = await peekAssignedDriverRate({
      originStationId: body.originStationId,
      destinationStationId: body.destinationStationId,
      passengers: body.passengers,
      luggageBig: body.luggageBig,
      luggageHand: body.luggageHand,
      needsChildSeat,
      needsPetFriendly,
      needsAccessible,
      needsLargeVehicle,
      pickupAt: body.pickupAt,
      destLat: destCoords?.lat ?? null,
      destLng: destCoords?.lng ?? null,
      originLat: originCoords?.lat ?? null,
      originLng: originCoords?.lng ?? null,
    })
    driverPerKm = peek?.perKm ?? null
    driverFixedPrice = peek?.fixedPrice ?? null
  }

  const basePrice = driverFixedPrice ?? await calculateRoutePrice(
    body.originStationId || null,
    body.destinationStationId || body.destination || '',
    body.originAddress,
    driverPerKm,
  )

  let extras = 0
  if (needsChildSeat) extras += 5
  if (needsPetFriendly) extras += 3
  if (needsLargeVehicle) extras += 8

  const totalPrice = Math.round((basePrice + extras) * 100) / 100

  const result: Record<string, unknown> = {
    basePrice,
    extras,
    totalPrice,
    needsChildSeat,
    needsPetFriendly,
    needsAccessible,
    needsLargeVehicle,
  }

  // Pre-autorización Stripe (captura manual: el cargo se hace al completar el viaje)
  if (body.createIntent) {
    if (await isStripeConfigured()) {
      try {
        const stripe = useStripe()
        const intent = await stripe.paymentIntents.create({
          amount: Math.round(totalPrice * 100),
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

async function calculateRoutePrice(
  originId: string | null,
  destinationId: string,
  originAddress?: string,
  driverPerKm?: number | null,
): Promise<number> {
  const db = useDb()

  // 1. Tarifa fija de ruta configurada por el admin (si el origen es una parada)
  if (originId) {
    const { data: prices } = await (db.rpc as any)('get_route_price', {
      p_origin_id: originId,
      p_destination_id: destinationId,
    })
    if (prices && prices.length > 0 && prices[0].base_price !== null) {
      return Number(prices[0].base_price)
    }
  }

  // 2. Estimación por distancia (€/km del conductor asignado > global)
  try {
    const estimate = await estimateDistancePrice(originId, destinationId, originAddress, driverPerKm)
    if (estimate) return estimate.price
  } catch (e) {
    console.error('[Pricing] Error estimando por distancia:', e)
  }

  // 3. Último recurso
  return 25
}
