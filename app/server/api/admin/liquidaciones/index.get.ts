export default defineEventHandler(async (event) => {
  requireRole(event, 'admin')
  const sql = useSql()

  const payouts = await sql`
    SELECT dp.*, u.full_name as driver_name, u.email as driver_email
    FROM driver_payouts dp
    JOIN drivers d ON d.id = dp.driver_id
    JOIN users u ON u.id = d.id
    ORDER BY dp.created_at DESC
  `

  return payouts
})
