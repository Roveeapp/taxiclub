export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const sql = useSql()

  const offers = await sql`
    SELECT ro.*, s.name as destination_station_name, u.full_name as driver_name,
           v.plate as driver_plate
    FROM return_offers ro
    JOIN stations s ON s.id = ro.destination_station_id
    JOIN drivers d ON d.id = ro.driver_id
    JOIN users u ON u.id = d.id
    LEFT JOIN vehicles v ON v.driver_id = d.id AND v.is_active = TRUE
    WHERE ro.id = ${id}
  `

  if (offers.length === 0) {
    throw createError({ statusCode: 404, message: 'Offer not found' })
  }

  return offers[0]
})
