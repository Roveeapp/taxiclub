export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  const id = getRouterParam(event, 'id')
  const db = useDb()

  const bookings = await db.execute`
    SELECT b.*, ba.confirmed_plate, ba.confirmed_phone, ba.confirmed_at,
           s.name as origin_station_name
    FROM bookings b
    LEFT JOIN booking_assignments ba ON ba.booking_id = b.id
    LEFT JOIN stations s ON s.id = b.origin_station_id
    WHERE b.id = ${id} AND b.client_id = ${user.id}
  `

  if (bookings.length === 0) {
    throw createError({ statusCode: 404, message: 'Booking not found' })
  }

  return bookings[0]
})
