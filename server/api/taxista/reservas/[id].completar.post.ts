export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  const id = getRouterParam(event, 'id')
  const db = useDb()

  const assignment = await db.execute`
    SELECT * FROM booking_assignments WHERE booking_id = ${id} AND driver_id = ${user.id}
  `

  if (assignment.length === 0) {
    throw createError({ statusCode: 404, message: 'Assignment not found' })
  }

  await db.execute`
    UPDATE bookings SET status = 'completed', updated_at = NOW() WHERE id = ${id}
  `

  const booking = await db.execute`SELECT * FROM bookings WHERE id = ${id}`
  const b = booking[0] as any

  if (b.stripe_payment_intent_id) {
    const stripe = useStripe()
    await stripe.paymentIntents.capture(b.stripe_payment_intent_id)
  }

  return { success: true }
})
