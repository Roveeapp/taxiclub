export default defineEventHandler(async (event) => {
  requireRole(event, 'admin')
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'Missing id' })
  const body = await readBody(event)
  const db = useDb()

  const user = requireAuth(event)

  const { error: updateError } = await (db
    .from('bookings') as any)
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

  if ((booking as any)?.stripe_payment_intent_id) {
    const stripe = useStripe()
    await stripe.paymentIntents.cancel((booking as any).stripe_payment_intent_id)
  }

  return { success: true }
})
