export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  const db = useDb()

  const stations = await db.execute`
    SELECT s.*, ds.joined_at, ds.is_active
    FROM driver_stations ds
    JOIN stations s ON s.id = ds.station_id
    WHERE ds.driver_id = ${user.id}
    ORDER BY s.name
  `

  return stations
})
