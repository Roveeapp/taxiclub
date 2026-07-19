/**
 * Usuarios registrados (clientes) con sus estadísticas de reservas.
 */
export default defineEventHandler(async (event) => {
  requireRole(event, 'admin')
  const db = useDb()

  const { data: users, error } = await db
    .from('users')
    .select('id, email, full_name, phone, role, created_at')
    .eq('role', 'client')
    .order('created_at', { ascending: false })

  if (error) throw createError({ statusCode: 500, message: error.message })

  const { data: bookings } = await db
    .from('bookings')
    .select('client_id, status, total_price, created_at')
    .not('client_id', 'is', null)

  interface UserStats { total: number, completed: number, cancelled: number, spent: number, lastBookingAt: string | null }
  const stats = new Map<string, UserStats>()

  for (const b of (bookings || []) as any[]) {
    let s = stats.get(b.client_id)
    if (!s) {
      s = { total: 0, completed: 0, cancelled: 0, spent: 0, lastBookingAt: null }
      stats.set(b.client_id, s)
    }
    s.total++
    if (b.status === 'completed') {
      s.completed++
      s.spent = Math.round((s.spent + Number(b.total_price || 0)) * 100) / 100
    }
    if (b.status === 'cancelled') s.cancelled++
    if (!s.lastBookingAt || b.created_at > s.lastBookingAt) s.lastBookingAt = b.created_at
  }

  return ((users || []) as any[]).map(u => ({
    ...u,
    stats: stats.get(u.id) || { total: 0, completed: 0, cancelled: 0, spent: 0, lastBookingAt: null },
  }))
})
