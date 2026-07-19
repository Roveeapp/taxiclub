/**
 * Ficha de un usuario: perfil + historial de reservas + estadísticas.
 */
export default defineEventHandler(async (event) => {
  requireRole(event, 'admin')
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'Missing id' })
  const db = useDb()

  const { data: user, error } = await db
    .from('users')
    .select('id, email, full_name, phone, role, created_at')
    .eq('id', id)
    .single()

  if (error || !user) throw createError({ statusCode: 404, message: 'Usuario no encontrado' })

  const { data: bookings } = await db
    .from('bookings')
    .select('id, status, total_price, pickup_at, created_at, destination_address, origin_address, origin_station_id, offer_id')
    .eq('client_id', id)
    .order('created_at', { ascending: false })
    .limit(100)

  const rows = (bookings || []) as any[]

  // Nombre de la parada de origen si la hay
  const stationIds = [...new Set(rows.map(b => b.origin_station_id).filter(Boolean))]
  const stationNames = new Map<string, string>()
  if (stationIds.length > 0) {
    const { data: stations } = await db.from('stations').select('id, name').in('id', stationIds)
    for (const s of (stations || []) as any[]) stationNames.set(s.id, s.name)
  }

  const stats = {
    total: rows.length,
    completed: rows.filter(b => b.status === 'completed').length,
    pending: rows.filter(b => b.status === 'pending' || b.status === 'confirmed').length,
    cancelled: rows.filter(b => b.status === 'cancelled').length,
    spent: Math.round(rows.filter(b => b.status === 'completed').reduce((sum, b) => sum + Number(b.total_price || 0), 0) * 100) / 100,
    offerBookings: rows.filter(b => b.offer_id).length,
  }

  return {
    ...(user as any),
    stats,
    bookings: rows.map(b => ({
      ...b,
      origin_label: stationNames.get(b.origin_station_id) || b.origin_address || '—',
    })),
  }
})
