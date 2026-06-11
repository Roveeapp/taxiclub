export default defineEventHandler(async () => {
  const sql = useSql()

  const offers = await sql`
    SELECT ro.*, s.name as destination_station_name, u.full_name as driver_name
    FROM return_offers ro
    JOIN stations s ON s.id = ro.destination_station_id
    JOIN drivers d ON d.id = ro.driver_id
    JOIN users u ON u.id = d.id
    WHERE ro.status = 'active'
      AND ro.available_until > NOW()
    ORDER BY ro.available_from ASC
  `

  return offers
})
