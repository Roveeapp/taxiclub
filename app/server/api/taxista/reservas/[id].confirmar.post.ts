export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  const id = getRouterParam(event, 'id')
  const body = await readBody(event)
  const db = useDb()

  const { data: assignment, error: findError } = await db
    .from('booking_assignments')
    .select('*')
    .eq('booking_id', id)
    .eq('driver_id', user.id)
    .single()

  if (findError || !assignment) {
    throw createError({ statusCode: 404, message: 'Assignment not found' })
  }

  const { error: updateError } = await db
    .from('booking_assignments')
    .update({
      confirmed_at: new Date().toISOString(),
      confirmed_plate: body.plate,
      confirmed_phone: body.phone,
      has_substitute: body.hasSub || false,
      substitute_plate: body.subPlate || null,
      substitute_phone: body.subPhone || null,
    })
    .eq('booking_id', id)

  if (updateError) {
    throw createError({ statusCode: 500, message: updateError.message })
  }

  const { error: bookingError } = await db
    .from('bookings')
    .update({ status: 'confirmed', updated_at: new Date().toISOString() })
    .eq('id', id)

  if (bookingError) {
    throw createError({ statusCode: 500, message: bookingError.message })
  }

  await notifyClientConfirmed(id as string)

  return { success: true }
})
