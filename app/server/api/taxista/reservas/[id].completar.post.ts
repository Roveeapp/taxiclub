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

  const { error: updateError } = await (db
    .from('bookings') as any)
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

  if ((booking as any)?.stripe_payment_intent_id) {
    const stripe = useStripe()
    await stripe.paymentIntents.capture((booking as any).stripe_payment_intent_id)
  }

  return { success: true }
})
