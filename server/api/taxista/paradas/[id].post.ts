export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  const stationId = getRouterParam(event, 'id')
  const db = useDb()

  await db.execute`
    INSERT INTO driver_stations (driver_id, station_id, is_active)
    VALUES (${user.id}, ${stationId}, TRUE)
    ON CONFLICT (driver_id, station_id) DO UPDATE SET is_active = TRUE
  `

  return { success: true }
})
