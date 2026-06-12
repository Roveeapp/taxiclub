export default defineEventHandler(async (event) => {
  requireRole(event, 'admin')
  const db = useDb()

  const today = new Date().toISOString().split('T')[0]

  const { data: metrics, error } = await (db.rpc as any)('get_metrics', { p_today: today })

  if (error || !metrics || metrics.length === 0) {
    return {
      bookingsToday: 0,
      activeDrivers: 0,
      monthlyRevenue: 0,
      activeOffers: 0,
    }
  }

  const m = metrics[0]
  return {
    bookingsToday: Number(m.bookings_today || 0),
    activeDrivers: Number(m.active_drivers || 0),
    monthlyRevenue: 0,
    activeOffers: Number(m.active_offers || 0),
  }
})
