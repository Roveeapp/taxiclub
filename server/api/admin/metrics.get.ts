export default defineEventHandler(async (event) => {
  requireRole(event, 'admin')
  const db = useDb()

  const today = new Date().toISOString().split('T')[0]
  const monthStart = new Date()
  monthStart.setDate(1)

  const [bookingsToday] = await db.execute`
    SELECT COUNT(*) as count FROM bookings WHERE created_at::date = ${today}
  `
  const [activeDrivers] = await db.execute`
    SELECT COUNT(*) as count FROM drivers WHERE is_active = TRUE
  `
  const [activeOffers] = await db.execute`
    SELECT COUNT(*) as count FROM return_offers WHERE status = 'active'
  `

  return {
    bookingsToday: Number(bookingsToday?.count || 0),
    activeDrivers: Number(activeDrivers?.count || 0),
    monthlyRevenue: 0,
    activeOffers: Number(activeOffers?.count || 0),
  }
})
