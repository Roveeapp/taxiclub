export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  const sql = useSql()

  const stations = await sql`
    SELECT s.*, ds.joined_at, ds.is_active
    FROM driver_stations ds
    JOIN stations s ON s.id = ds.station_id
    WHERE ds.driver_id = ${user.id}
    ORDER BY s.name
  `

  return stations
})
