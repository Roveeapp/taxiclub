export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  const id = getRouterParam(event, 'id')

  const { data: reservations, error } = await callRpc<Array<Record<string, unknown>>>('get_reservation_by_id', {
    p_booking_id: id,
    p_driver_id: user.id,
  })

  if (error || !reservations || (reservations as Array<Record<string, unknown>>).length === 0) {
    throw createError({ statusCode: 404, message: 'Reservation not found' })
  }

  return reservations[0]
})
