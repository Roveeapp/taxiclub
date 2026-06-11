export default defineEventHandler(async (event) => {
  requireRole(event, 'admin')
  const sql = useSql()

  const today = new Date().toISOString().split('T')[0]
  const monthStart = new Date()
  monthStart.setDate(1)

  const [bookingsToday] = await sql`
    SELECT COUNT(*) as count FROM bookings WHERE created_at::date = ${today}
  `
  const [activeDrivers] = await sql`
    SELECT COUNT(*) as count FROM drivers WHERE is_active = TRUE
  `
  const [activeOffers] = await sql`
    SELECT COUNT(*) as count FROM return_offers WHERE status = 'active'
  `

  return {
    bookingsToday: Number(bookingsToday?.count || 0),
    activeDrivers: Number(activeDrivers?.count || 0),
    monthlyRevenue: 0,
    activeOffers: Number(activeOffers?.count || 0),
  }
})
