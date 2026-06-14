export default defineEventHandler(async (event) => {
  const user = event.context.user
  const id = getRouterParam(event, 'id')
  const db = useDb()

  const { data: bookings, error } = await (db.rpc as Function)('get_booking_by_id', { p_id: id, p_user_id: user?.id || null })

  if (error || !bookings || bookings.length === 0) {
    throw createError({ statusCode: 404, message: 'Booking not found' })
  }

  return bookings[0]
})
