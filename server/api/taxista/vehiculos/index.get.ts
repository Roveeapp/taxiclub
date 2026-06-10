export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  const db = useDb()

  const vehicles = await db.execute`
    SELECT * FROM vehicles WHERE driver_id = ${user.id} AND is_active = TRUE
    ORDER BY created_at DESC
  `

  return vehicles
})
