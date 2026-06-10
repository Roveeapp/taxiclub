export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  const id = getRouterParam(event, 'id')
  const db = useDb()

  const booking = await db.execute`
    SELECT * FROM bookings WHERE id = ${id} AND client_id = ${user.id}
  `

  if (booking.length === 0) {
    throw createError({ statusCode: 404, message: 'Booking not found' })
  }

  const b = booking[0] as any
  if (b.status === 'cancelled') {
    throw createError({ statusCode: 400, message: 'Booking already cancelled' })
  }

  const config = await getSystemConfig()
  const maxCancelHours = Number(config.max_cancel_hours_before || 24)
  const pickupAt = new Date(b.pickup_at)
  const hoursUntilPickup = (pickupAt.getTime() - Date.now()) / (1000 * 60 * 60)

  if (hoursUntilPickup < maxCancelHours) {
    throw createError({ statusCode: 400, message: 'Cannot cancel within ' + maxCancelHours + ' hours of pickup' })
  }

  await db.execute`
    UPDATE bookings SET status = 'cancelled', cancelled_at = NOW(), cancelled_by = ${user.id}, updated_at = NOW()
    WHERE id = ${id}
  `

  if (b.stripe_payment_intent_id) {
    const stripe = useStripe()
    await stripe.paymentIntents.cancel(b.stripe_payment_intent_id)
  }

  return { success: true }
})
