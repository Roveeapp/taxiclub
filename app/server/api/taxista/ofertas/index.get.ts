export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  const sql = useSql()

  const offers = await sql`
    SELECT ro.*, s.name as destination_station_name
    FROM return_offers ro
    JOIN stations s ON s.id = ro.destination_station_id
    WHERE ro.driver_id = ${user.id}
    ORDER BY ro.created_at DESC
  `

  return offers
})
