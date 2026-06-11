export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  const sql = useSql()

  const availability = await sql`
    SELECT * FROM driver_availability
    WHERE driver_id = ${user.id}
    ORDER BY date
  `

  return availability
})
