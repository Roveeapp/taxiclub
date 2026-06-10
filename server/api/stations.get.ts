export default defineEventHandler(async () => {
  const db = useDb()
  const stations = await db.execute`
    SELECT id, name, city, address, lat, lng
    FROM stations
    WHERE is_active = TRUE
    ORDER BY name
  `
  return stations
})
