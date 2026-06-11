export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  const id = getRouterParam(event, 'id')
  const db = useDb()

  const { data: bookings, error } = await db
    .rpc('get_booking_by_id', { p_id: id, p_user_id: user.id })

  if (error || !bookings || bookings.length === 0) {
    throw createError({ statusCode: 404, message: 'Booking not found' })
  }

  return bookings[0]
})
