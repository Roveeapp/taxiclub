export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'Missing id' })
  const db = useDb()

  // Dos vías de autorización: usuario dueño de la reserva, o token firmado
  // (invitados que llegan desde el enlace de su email).
  const token = getQuery(event).token as string | undefined
  const hasValidToken = verifyBookingToken(id, token)
  const user = hasValidToken ? event.context.user : requireAuth(event)

  let query = db.from('bookings').select('*').eq('id', id)
  if (!hasValidToken) {
    query = query.eq('client_id', user!.id)
  } else {
    // El token solo autoriza reservas de invitado
    query = query.is('client_id', null)
  }
  const { data: booking, error: findError } = await query.single<{ status: string, pickup_at: string, stripe_payment_intent_id: string | null }>()

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

  const { error: updateError } = await writeTable('bookings')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      cancelled_by: user?.id || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (updateError) {
    throw createError({ statusCode: 500, message: updateError.message })
  }

  // Liberar la pre-autorización (best-effort)
  const piId = booking.stripe_payment_intent_id ?? undefined
  if (piId && !piId.startsWith('pi_mock_')) {
    try {
      const stripe = useStripe()
      await stripe.paymentIntents.cancel(piId)
    } catch (e) {
      console.error(`[Stripe] Error liberando pago de reserva ${id}:`, e)
    }
  }

  return { success: true }
})
