/**
 * Baja definitiva de un conductor: elimina su cuenta de Auth y sus
 * filas de users/drivers (cascada). Sus reservas históricas se
 * conservan (asignaciones con driver_id huérfano se eliminan por FK).
 */
export default defineEventHandler(async (event) => {
  requireRole(event, 'admin')
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'Missing id' })
  const db = useDb()

  const { data: driver } = await db.from('drivers').select('id').eq('id', id).single()
  if (!driver) throw createError({ statusCode: 404, message: 'Conductor no encontrado' })

  // No permitir borrar si tiene reservas activas
  const { data: active } = await db
    .from('booking_assignments')
    .select('booking_id, bookings!inner(status)')
    .eq('driver_id', id)
    .in('bookings.status', ['pending', 'confirmed'])
    .limit(1)

  if (active && (active as any[]).length > 0) {
    throw createError({
      statusCode: 400,
      message: 'Tiene reservas pendientes o confirmadas. Reasígnalas o cancélalas antes de darle de baja.',
    })
  }

  // Cancelar sus ofertas activas
  await (db.from('return_offers') as any)
    .update({ status: 'cancelled' })
    .eq('driver_id', id)
    .eq('status', 'active')

  // Eliminar auth + users (drivers cae en cascada)
  const { error: authError } = await db.auth.admin.deleteUser(id)
  if (authError && !authError.message?.includes('not found')) {
    throw createError({ statusCode: 500, message: authError.message })
  }
  await db.from('users').delete().eq('id', id)

  return { success: true }
})
