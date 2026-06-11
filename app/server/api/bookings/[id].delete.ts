export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  const id = getRouterParam(event, 'id')
  const db = useDb()

  const { data: booking, error: findError } = await db
    .from('bookings')
    .select('*')
    .eq('id', id)
    .eq('client_id', user.id)
    .single()

  if (findError || !booking) {
    throw createError({ statusCode: 404, message: 'Booking not found' })
  }

  if (booking.status === 'cancelled') {
    throw createError({ statusCode: 400, message: 'Booking already cancelled' })
  }

  const config = await getSystemConfig()
  const maxCancelHours = Number(config.max_cancel_hours_before || 24)
  const pickupAt = new Date(booking.pickup_at)
  const hoursUntilPickup = (pickupAt.getTime() - Date.now()) / (1000 * 60 * 60)

  if (hoursUntilPickup < maxCancelHours) {
    throw createError({ statusCode: 400, message: 'Cannot cancel within ' + maxCancelHours + ' hours of pickup' })
  }

  const { error: updateError } = await db
    .from('bookings')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      cancelled_by: user.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (updateError) {
    throw createError({ statusCode: 500, message: updateError.message })
  }

  if (booking.stripe_payment_intent_id) {
    const stripe = useStripe()
    await stripe.paymentIntents.cancel(booking.stripe_payment_intent_id)
  }

  return { success: true }
})
