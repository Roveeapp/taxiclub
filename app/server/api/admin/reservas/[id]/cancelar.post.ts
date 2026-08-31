export default defineEventHandler(async (event) => {
  requireRole(event, 'admin')
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'Missing id' })
  const body = await readValidated(event, cancelarReservaSchema)
  const db = useDb()

  const user = requireAuth(event)

  const { error: updateError } = await writeTable('bookings')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      cancelled_by: user.id,
      cancellation_reason: body.reason || 'Cancelled by admin',
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (updateError) {
    throw createError({ statusCode: 500, message: updateError.message })
  }

  const { data: booking } = await db
    .from('bookings')
    .select('stripe_payment_intent_id')
    .eq('id', id)
    .single()

  // Liberar la pre-autorización (best-effort)
  const piId = (booking as any)?.stripe_payment_intent_id as string | undefined
  if (piId && !piId.startsWith('pi_mock_')) {
    try {
      const stripe = useStripe()
      await stripe.paymentIntents.cancel(piId)
    } catch (e) {
      console.error(`[Stripe] Error liberando pago de reserva ${id}:`, e)
    }
  }

  // Avisar al cliente (best-effort)
  await notifyClientCancelled(id, body.reason || 'Cancelada por el administrador').catch((e) => {
    console.error('[Notify] Error avisando cancelación:', e)
  })

  return { success: true }
})
