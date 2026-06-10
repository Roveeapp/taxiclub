export default defineEventHandler(async (event) => {
  requireRole(event, 'admin')
  const body = await readBody(event)
  const db = useDb()

  const [station] = await db.execute`
    INSERT INTO stations (name, city, address, lat, lng)
    VALUES (${body.name}, ${body.city}, ${body.address || null}, ${body.lat || null}, ${body.lng || null})
    RETURNING *
  `

  return station
})
