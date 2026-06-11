export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  const sql = useSql()

  const addresses = await sql`
    SELECT id, label, address, lat, lng, is_favorite
    FROM saved_addresses
    WHERE user_id = ${user.id}
    ORDER BY is_favorite DESC, created_at DESC
  `
  return addresses
})
