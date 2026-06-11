export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  const body = await readBody(event)
  const sql = useSql()

  const [address] = await sql`
    INSERT INTO saved_addresses (user_id, label, address, lat, lng, is_favorite)
    VALUES (${user.id}, ${body.label}, ${body.address}, ${body.lat || null}, ${body.lng || null}, ${body.is_favorite || false})
    RETURNING id, label, address, lat, lng, is_favorite
  `
  return address
})
