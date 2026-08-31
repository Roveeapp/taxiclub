/**
 * Asignación manual de un taxista a una reserva por parte del admin.
 * - Si la reserva ya tenía conductor, se reasigna y se resetea la
 *   confirmación (el nuevo taxista debe confirmar matrícula/teléfono).
 * - Notifica al taxista por email/SMS/push como en la asignación automática.
 */
export default defineEventHandler(async (event) => {
  requireRole(event, 'admin')
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'Missing id' })
  const body = await readValidated(event, asignarReservaSchema)
  const driverId = body?.driverId as string | undefined
  if (!driverId) throw createError({ statusCode: 400, message: 'driverId es obligatorio' })

  const db = useDb()

  // 1. Reserva válida
  const { data: booking, error: bookingError } = await db
    .from('bookings')
    .select('*')
    .eq('id', id)
    .single()

  if (bookingError || !booking) {
    throw createError({ statusCode: 404, message: 'Reserva no encontrada' })
  }
  const b = booking as { id: string, origin_station_id: string | null, [k: string]: unknown }
  if (b.status === 'cancelled' || b.status === 'completed') {
    throw createError({ statusCode: 400, message: 'No se puede asignar una reserva cancelada o completada' })
  }

  // Las reservas de ofertas de Última Hora pertenecen SIEMPRE al
  // conductor que publicó la oferta: no se pueden reasignar.
  if (b.offer_id) {
    throw createError({
      statusCode: 400,
      message: 'Esta reserva proviene de una oferta de Última Hora y pertenece a su creador. Si no puede realizarla, cancela la reserva.',
    })
  }

  // 2. Conductor válido (activo; el admin puede saltarse la aprobación
  //    automática pero no asignar a conductores desactivados)
  const { data: driver, error: driverError } = await db
    .from('drivers')
    .select('*')
    .eq('id', driverId)
    .single()

  if (driverError || !driver) {
    throw createError({ statusCode: 404, message: 'Conductor no encontrado' })
  }
  if (!driver.is_active) {
    throw createError({ statusCode: 400, message: 'El conductor está desactivado' })
  }

  // 3. Crear o reasignar
  const { data: existing } = await db
    .from('booking_assignments')
    .select('id, driver_id')
    .eq('booking_id', id)
    .maybeSingle()

  if (existing) {
    const { error: updError } = await writeTable('booking_assignments')
      .update({
        driver_id: driverId,
        assigned_at: new Date().toISOString(),
        confirmed_at: null,
        confirmed_plate: null,
        confirmed_phone: null,
        has_substitute: false,
        substitute_plate: null,
        substitute_phone: null,
      })
      .eq('id', existing.id)
    if (updError) throw createError({ statusCode: 500, message: updError.message })
  } else {
    const { error: insError } = await writeTable('booking_assignments')
      .insert({ booking_id: id, driver_id: driverId })
    if (insError) throw createError({ statusCode: 500, message: insError.message })
  }

  // 4. La reserva vuelve a pendiente hasta que el nuevo taxista confirme
  await writeTable('bookings')
    .update({ status: 'pending', updated_at: new Date().toISOString() })
    .eq('id', id)

  await writeTable('drivers')
    .update({ last_assigned_at: new Date().toISOString() })
    .eq('id', driverId)

  // 5. Notificar al taxista (best-effort)
  const { data: station } = b.origin_station_id
    ? await db.from('stations').select('name').eq('id', b.origin_station_id).single()
    : { data: null }

  await notifyDriver(driverId, {
    ...b,
    origin_station_name: station?.name || '',
  }).catch((e: unknown) => {
    console.error('[Notify] Error avisando al conductor asignado:', e)
  })

  return { success: true, driverId }
})
