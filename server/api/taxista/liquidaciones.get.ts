export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  const db = useDb()

  const payouts = await db.execute`
    SELECT * FROM driver_payouts
    WHERE driver_id = ${user.id}
    ORDER BY period_start DESC
  `

  return payouts
})
