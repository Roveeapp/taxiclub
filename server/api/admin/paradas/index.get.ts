export default defineEventHandler(async (event) => {
  requireRole(event, 'admin')
  const db = useDb()

  const stations = await db.execute`
    SELECT s.*,
      (SELECT COUNT(*) FROM driver_stations ds WHERE ds.station_id = s.id AND ds.is_active = TRUE) as driver_count
    FROM stations s
    ORDER BY s.name
  `

  return stations
})
