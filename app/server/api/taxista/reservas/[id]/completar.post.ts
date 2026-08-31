export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'Missing id' })
  const db = useDb()

  const { data: assignment, error: findError } = await db
    .from('booking_assignments')
    .select('*')
    .eq('booking_id', id)
    .eq('driver_id', user.id)
    .single()

  if (findError || !assignment) {
    throw createError({ statusCode: 404, message: 'Assignment not found' })
  }

  const { error: updateError } = await writeTable('bookings')
    .update({ status: 'completed', updated_at: new Date().toISOString() })
    .eq('id', id)

  if (updateError) {
    throw createError({ statusCode: 500, message: updateError.message })
  }

  const { data: booking } = await db
    .from('bookings')
    .select('stripe_payment_intent_id')
    .eq('id', id)
    .single()

  // Capturar la pre-autorización (el cobro real). Best-effort: si falla,
  // el viaje queda completado y el admin puede capturar desde Stripe.
  const piId = (booking as any)?.stripe_payment_intent_id as string | undefined
  let paymentCaptured = false
  if (piId && !piId.startsWith('pi_mock_')) {
    try {
      const stripe = useStripe()
      const pi = await stripe.paymentIntents.retrieve(piId)
      if (pi.status === 'requires_capture') {
        await stripe.paymentIntents.capture(piId)
        paymentCaptured = true
      } else if (pi.status === 'succeeded') {
        paymentCaptured = true
      }
    } catch (e) {
      console.error(`[Stripe] Error capturando pago de reserva ${id}:`, e)
    }
  }

  return { success: true, paymentCaptured }
})
