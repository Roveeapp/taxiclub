export default defineEventHandler(async (event) => {
  requireRole(event, 'admin')
  const id = getRouterParam(event, 'id')
  const body = await readBody(event)
  const sql = useSql()

  const user = requireAuth(event)

  await sql`
    UPDATE bookings SET status = 'cancelled', cancelled_at = NOW(), cancelled_by = ${user.id},
    cancellation_reason = ${body.reason || 'Cancelled by admin'}, updated_at = NOW()
    WHERE id = ${id}
  `

  const booking = await sql`SELECT stripe_payment_intent_id FROM bookings WHERE id = ${id}`
  const b = booking[0] as any

  if (b?.stripe_payment_intent_id) {
    const stripe = useStripe()
    await stripe.paymentIntents.cancel(b.stripe_payment_intent_id)
  }

  return { success: true }
})
