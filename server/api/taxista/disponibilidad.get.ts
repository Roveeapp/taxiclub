export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  const db = useDb()

  const availability = await db.execute`
    SELECT * FROM driver_availability
    WHERE driver_id = ${user.id}
    ORDER BY date
  `

  return availability
})
