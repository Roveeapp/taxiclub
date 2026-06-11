export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  const id = getRouterParam(event, 'id')
  const sql = useSql()

  const reservations = await sql`
    SELECT b.*, ba.*, s.name as origin_station_name, u.full_name as client_name, u.phone as client_phone
    FROM booking_assignments ba
    JOIN bookings b ON b.id = ba.booking_id
    LEFT JOIN stations s ON s.id = b.origin_station_id
    LEFT JOIN users u ON u.id = b.client_id
    WHERE ba.booking_id = ${id} AND ba.driver_id = ${user.id}
  `

  if (reservations.length === 0) {
    throw createError({ statusCode: 404, message: 'Reservation not found' })
  }

  return reservations[0]
})
