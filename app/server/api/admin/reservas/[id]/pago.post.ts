/**
 * Acciones de pago del admin sobre una reserva:
 *   capture → cobra la pre-autorización
 *   cancel  → libera la pre-autorización
 *   refund  → devuelve un pago ya capturado
 */
export default defineEventHandler(async (event) => {
  requireRole(event, 'admin')
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'Missing id' })
  const body = await readValidated(event, pagoReservaSchema)
  // Con los pagos desactivados no hay nada que capturar ni devolver. Sin esto
  // el admin recibía un error crudo de Stripe («no API key»), que no explica
  // que es una decisión de configuración y no una avería.
  if (!await arePaymentsEnabled()) {
    throw createError({
      statusCode: 409,
      message: 'Los pagos están desactivados. Actívalos en Configuración para capturar o devolver cobros.',
    })
  }

  const action = body?.action as 'capture' | 'cancel' | 'refund' | undefined

  if (!action || !['capture', 'cancel', 'refund'].includes(action)) {
    throw createError({ statusCode: 400, message: 'Acción no válida' })
  }

  const db = useDb()
  const { data: booking } = await db
    .from('bookings')
    .select('stripe_payment_intent_id')
    .eq('id', id)
    .single()

  const piId = (booking as { stripe_payment_intent_id?: string | null } | null)?.stripe_payment_intent_id ?? undefined
  if (!piId || piId.startsWith('pi_mock_')) {
    throw createError({ statusCode: 400, message: 'Esta reserva no tiene un pago real de Stripe' })
  }

  const stripe = useStripe()

  try {
    if (action === 'capture') {
      const pi = await stripe.paymentIntents.capture(piId)
      return { success: true, status: pi.status }
    }
    if (action === 'cancel') {
      const pi = await stripe.paymentIntents.cancel(piId)
      return { success: true, status: pi.status }
    }
    // refund
    const refund = await stripe.refunds.create({ payment_intent: piId })
    return { success: true, status: refund.status }
  } catch (e) {
    throw createError({ statusCode: 400, message: (e as Error)?.message || 'La operación de Stripe ha fallado' })
  }
})
