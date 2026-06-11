export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  const sql = useSql()

  const vehicles = await sql`
    SELECT * FROM vehicles WHERE driver_id = ${user.id} AND is_active = TRUE
    ORDER BY created_at DESC
  `

  return vehicles
})
