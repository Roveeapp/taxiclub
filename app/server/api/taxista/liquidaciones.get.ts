export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  const sql = useSql()

  const payouts = await sql`
    SELECT * FROM driver_payouts
    WHERE driver_id = ${user.id}
    ORDER BY period_start DESC
  `

  return payouts
})
