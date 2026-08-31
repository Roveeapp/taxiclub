/**
 * Estadísticas del admin: viajes e ingresos por taxista en un mes.
 * Query: ?month=YYYY-MM (por defecto, el mes actual)
 */
export default defineEventHandler(async (event) => {
  requireRole(event, 'admin')
  const db = useDb()
  const query = getQuery(event)

  const monthStr = (query.month as string) || new Date().toISOString().slice(0, 7)
  const [year, month] = monthStr.split('-').map(Number)
  if (!year || !month || month < 1 || month > 12) {
    throw createError({ statusCode: 400, message: 'Mes no válido (usa YYYY-MM)' })
  }

  const start = new Date(year, month - 1, 1)
  const end = new Date(year, month, 1)

  // Reservas del mes con su asignación
  const { data: bookings } = await db
    .from('bookings')
    .select('id, status, total_price, pickup_at')
    .gte('pickup_at', start.toISOString())
    .lt('pickup_at', end.toISOString())

  const bookingRows = (bookings || [])
  const bookingIds = bookingRows.map(b => b.id)

  let assignments: Array<{ booking_id: string, driver_id: string }> = []
  if (bookingIds.length > 0) {
    const { data } = await db
      .from('booking_assignments')
      .select('booking_id, driver_id')
      .in('booking_id', bookingIds)
    assignments = (data || [])
  }
  const driverByBooking = new Map(assignments.map(a => [a.booking_id, a.driver_id]))

  // Conductores (para nombre y comisión personalizada)
  const { data: drivers } = await db.rpc('get_admin_drivers')
  const driverRows = ((drivers || []))
  const config = await getSystemConfig()

  interface DriverStats {
    driverId: string
    name: string
    licenseNumber: string
    isMember: boolean
    completed: number
    pending: number
    cancelled: number
    revenue: number
    commission: number
  }

  const statsMap = new Map<string, DriverStats>()
  for (const d of driverRows) {
    statsMap.set(d.id, {
      driverId: d.id,
      name: d.full_name || '—',
      licenseNumber: d.license_number || '',
      isMember: !!d.is_member,
      completed: 0,
      pending: 0,
      cancelled: 0,
      revenue: 0,
      commission: 0,
    })
  }

  let unassigned = 0
  const totals = { bookings: bookingRows.length, completed: 0, cancelled: 0, revenue: 0, commission: 0 }

  for (const b of bookingRows) {
    const driverId = driverByBooking.get(b.id)
    const stat = driverId ? statsMap.get(driverId) : undefined
    const price = Number(b.total_price || 0)

    if (b.status === 'cancelled') {
      totals.cancelled++
      if (stat) stat.cancelled++
      continue
    }
    if (!stat) { unassigned++; continue }

    if (b.status === 'completed') {
      const d = driverRows.find(r => r.id === driverId)
      const pct = d?.custom_commission_pct !== null && d?.custom_commission_pct !== undefined
        ? Number(d.custom_commission_pct)
        : d?.is_member
          ? Number(config.commission_member_pct || 10)
          : Number(config.commission_non_member_pct || 12)
      const commission = Math.round(price * pct) / 100

      stat.completed++
      stat.revenue = Math.round((stat.revenue + price) * 100) / 100
      stat.commission = Math.round((stat.commission + commission) * 100) / 100
      totals.completed++
      totals.revenue = Math.round((totals.revenue + price) * 100) / 100
      totals.commission = Math.round((totals.commission + commission) * 100) / 100
    } else {
      stat.pending++
    }
  }

  const perDriver = Array.from(statsMap.values())
    .filter(s => s.completed + s.pending + s.cancelled > 0)
    .sort((a, b) => b.revenue - a.revenue || b.completed - a.completed)

  return { month: monthStr, totals, unassigned, perDriver }
})
