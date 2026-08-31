/**
 * Vista global de todas las ofertas de Última Hora (todas las
 * fases y todos los conductores) + métricas agregadas.
 */
export default defineEventHandler(async (event) => {
  requireRole(event, 'admin')
  const db = useDb()

  await expireStaleOffers()

  const { data: offers, error } = await db
    .from('return_offers')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(300)

  if (error) throw createError({ statusCode: 500, message: error.message })
  const rows = offers || []

  // Nombres de conductores y paradas
  const driverIds = [...new Set(rows.map(o => o.driver_id).filter((id): id is string => Boolean(id)))]
  const stationIds = [...new Set(rows.map(o => o.destination_station_id).filter((id): id is string => Boolean(id)))]

  const driverNames = new Map<string, string>()
  if (driverIds.length > 0) {
    const { data: users } = await db.from('users').select('id, full_name').in('id', driverIds)
    for (const u of users || []) driverNames.set(u.id, u.full_name || '—')
  }

  const stationNames = new Map<string, string>()
  if (stationIds.length > 0) {
    const { data: stations } = await db.from('stations').select('id, name').in('id', stationIds)
    for (const s of stations || []) stationNames.set(s.id, s.name)
  }

  const totals = {
    total: rows.length,
    active: rows.filter(o => o.status === 'active').length,
    booked: rows.filter(o => o.status === 'booked').length,
    expired: rows.filter(o => o.status === 'expired').length,
    cancelled: rows.filter(o => o.status === 'cancelled').length,
    bookedValue: Math.round(rows.filter(o => o.status === 'booked').reduce((sum, o) => sum + Number(o.final_price || 0), 0) * 100) / 100,
  }

  return {
    totals,
    offers: rows.map(o => ({
      ...o,
      driver_name: driverNames.get(o.driver_id) || '—',
      destination_station_name: (o.destination_station_id ? stationNames.get(o.destination_station_id) : null) || '—',
    })),
  }
})
