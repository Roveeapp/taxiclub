export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  const sql = useSql()

  const assignments = await sql`
    SELECT b.*, ba.confirmed_plate, ba.confirmed_phone, ba.confirmed_at, ba.has_substitute,
           ba.substitute_plate, ba.substitute_phone,
           s.name as origin_station_name
    FROM booking_assignments ba
    JOIN bookings b ON b.id = ba.booking_id
    LEFT JOIN stations s ON s.id = b.origin_station_id
    WHERE ba.driver_id = ${user.id}
    ORDER BY b.pickup_at DESC
  `

  return assignments
})
