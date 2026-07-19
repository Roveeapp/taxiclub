/**
 * Crea la pre-autorización de la SEÑAL (10% del precio final) para
 * reservar una oferta de Última Hora. El resto se paga al taxista.
 */
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'Missing id' })
  const db = useDb()

  const { data: offer, error } = await db
    .from('return_offers')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !offer) throw createError({ statusCode: 404, message: 'Oferta no encontrada' })
  const o = offer as Record<string, any>

  if (o.status !== 'active') {
    throw createError({ statusCode: 400, message: 'Esta oferta ya no está disponible' })
  }
  if (new Date(o.available_until).getTime() < Date.now()) {
    throw createError({ statusCode: 400, message: 'Esta oferta ha expirado' })
  }

  const finalPrice = Number(o.final_price)
  const depositPct = 10
  const deposit = Math.round(finalPrice * depositPct) / 100
  const remainder = Math.round((finalPrice - deposit) * 100) / 100

  const result: Record<string, unknown> = {
    finalPrice,
    depositPct,
    deposit,
    remainder,
  }

  if (await isStripeConfigured()) {
    try {
      const stripe = useStripe()
      const intent = await stripe.paymentIntents.create({
        amount: Math.round(deposit * 100),
        currency: 'eur',
        capture_method: 'manual',
        automatic_payment_methods: { enabled: true, allow_redirects: 'never' },
        metadata: {
          type: 'offer_deposit',
          offer_id: id,
        },
      })
      result.clientSecret = intent.client_secret
      result.paymentIntentId = intent.id
    } catch (e) {
      console.error('Stripe offer intent error:', e)
    }
  }

  return result
})
