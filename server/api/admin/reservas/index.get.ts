export default defineEventHandler(async (event) => {
  requireRole(event, 'admin')
  const db = useDb()
  const query = getQuery(event)

  let sql = `
    SELECT b.*, u.full_name as client_name, u.email as client_email,
           ba.driver_id, ba.confirmed_plate, ba.confirmed_phone,
           s.name as origin_station_name
    FROM bookings b
    LEFT JOIN users u ON u.id = b.client_id
    LEFT JOIN booking_assignments ba ON ba.booking_id = b.id
    LEFT JOIN stations s ON s.id = b.origin_station_id
  `

  const conditions: string[] = []
  if (query.status) conditions.push(`b.status = '${query.status}'`)
  if (query.date) conditions.push(`b.pickup_at::date = '${query.date}'`)

  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ')
  }

  sql += ' ORDER BY b.created_at DESC'

  const bookings = await db.execute(sql)
  return bookings
})
