export default defineEventHandler(async () => {
  const sql = useSql()
  const stations = await sql`
    SELECT id, name, city, address, lat, lng
    FROM stations
    WHERE is_active = TRUE
    ORDER BY name
  `
  return stations
})
