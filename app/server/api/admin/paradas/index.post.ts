export default defineEventHandler(async (event) => {
  requireRole(event, 'admin')
  const body = await readBody(event)
  const sql = useSql()

  const [station] = await sql`
    INSERT INTO stations (name, city, address, lat, lng)
    VALUES (${body.name}, ${body.city}, ${body.address || null}, ${body.lat || null}, ${body.lng || null})
    RETURNING *
  `

  return station
})
