export default defineEventHandler(async (event) => {
  requireRole(event, 'admin')
  const db = useDb()

  const today = new Date().toISOString().split('T')[0]

  const { data: metrics, error } = await callRpc<Array<Record<string, unknown>>>('get_metrics', { p_today: today })

  // Se comprueba la fila y no la longitud: TypeScript no estrecha el acceso
  // por índice desde un length, y así `m` queda garantizada más abajo.
  const m = metrics?.[0]
  if (error || !m) {
    return {
      bookingsToday: 0,
      activeDrivers: 0,
      monthlyRevenue: 0,
      activeOffers: 0,
    }
  }


  // Serie diaria (últimos 14 días) e ingresos del mes, calculados en JS
  // para no depender de otra migración.
  const since = new Date()
  since.setDate(since.getDate() - 13)
  since.setHours(0, 0, 0, 0)
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1)

  let dailyBookings: Array<{ date: string, count: number, revenue: number }> = []
  let monthlyRevenue = 0

  try {
    const { data: recent } = await db
      .from('bookings')
      .select('created_at, total_price, status')
      .gte('created_at', since.toISOString())

    const byDay = new Map<string, { count: number, revenue: number }>()
    for (let i = 0; i < 14; i++) {
      const d = new Date(since)
      d.setDate(since.getDate() + i)
      byDay.set(d.toISOString().slice(0, 10), { count: 0, revenue: 0 })
    }
    for (const b of (recent || []) as Array<Record<string, unknown>>) {
      const day = String(b.created_at).slice(0, 10)
      const bucket = byDay.get(day)
      if (bucket && b.status !== 'cancelled') {
        bucket.count++
        bucket.revenue += Number(b.total_price || 0)
      }
    }
    dailyBookings = Array.from(byDay.entries()).map(([date, v]) => ({
      date,
      count: v.count,
      revenue: Math.round(v.revenue * 100) / 100,
    }))

    const { data: monthRows } = await db
      .from('bookings')
      .select('total_price')
      .eq('status', 'completed')
      .gte('created_at', monthStart.toISOString())

    monthlyRevenue = Math.round(
      ((monthRows || []) as Array<{ total_price?: number | string | null }>)
        .reduce((sum, r) => sum + Number(r.total_price || 0), 0) * 100,
    ) / 100
  } catch (e) {
    console.error('[Metrics] Error calculando series:', e)
  }

  return {
    bookingsToday: Number(m.bookings_today || 0),
    activeDrivers: Number(m.active_drivers || 0),
    monthlyRevenue,
    activeOffers: Number(m.active_offers || 0),
    dailyBookings,
  }
})
