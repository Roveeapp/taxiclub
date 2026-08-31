export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'Missing id' })

  // Dos vías de autorización, las mismas que ya usaba [id].delete.ts: usuario
  // dueño de la reserva, o token firmado (invitados que llegan desde el enlace
  // de su email).
  //
  // Antes esta ruta no comprobaba nada: pasaba `user?.id || null` al RPC
  // get_booking_by_id, cuyo WHERE es
  //   AND (b.client_id IS NULL OR b.client_id = p_user_id)
  // así que cualquiera que conociera el UUID de una reserva de invitado veía su
  // nombre, correo, teléfono, direcciones, precio y stripe_payment_intent_id.
  // El front ya enviaba ?token=..., pero el servidor lo ignoraba, con lo que
  // todo el mecanismo de firma quedaba decorativo en la lectura.
  const token = getQuery(event).token as string | undefined
  const hasValidToken = verifyBookingToken(id, token)
  const user = hasValidToken ? event.context.user : requireAuth(event)

  const { data: bookings, error } = await callRpc<Array<Record<string, unknown>>>(
    'get_booking_by_id',
    { p_id: id, p_user_id: user?.id || null },
  )

  const booking = bookings?.[0]
  if (error || !booking) {
    throw createError({ statusCode: 404, message: 'Booking not found' })
  }

  // El token solo autoriza reservas de invitado. Sin él, la reserva tiene que
  // ser del usuario autenticado: el RPC devuelve también las de invitado
  // cuando client_id es NULL, así que hay que descartarlas aquí.
  if (hasValidToken) {
    if (booking.client_id !== null) {
      throw createError({ statusCode: 404, message: 'Booking not found' })
    }
  } else if (booking.client_id !== user!.id) {
    throw createError({ statusCode: 404, message: 'Booking not found' })
  }

  return booking
})
