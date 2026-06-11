export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  const id = getRouterParam(event, 'id')
  const body = await readBody(event)
  const sql = useSql()

  const assignment = await sql`
    SELECT * FROM booking_assignments WHERE booking_id = ${id} AND driver_id = ${user.id}
  `

  if (assignment.length === 0) {
    throw createError({ statusCode: 404, message: 'Assignment not found' })
  }

  await sql`
    UPDATE booking_assignments SET
      confirmed_at = NOW(),
      confirmed_plate = ${body.plate},
      confirmed_phone = ${body.phone},
      has_substitute = ${body.hasSub || false},
      substitute_plate = ${body.subPlate || null},
      substitute_phone = ${body.subPhone || null}
    WHERE booking_id = ${id}
  `

  await sql`
    UPDATE bookings SET status = 'confirmed', updated_at = NOW() WHERE id = ${id}
  `

  await notifyClientConfirmed(id as string)

  return { success: true }
})
