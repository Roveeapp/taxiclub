export default defineEventHandler(async (event) => {
  requireRole(event, 'admin')
  const id = getRouterParam(event, 'id')
  const body = await readBody(event)
  const sql = useSql()

  await sql`
    UPDATE stations SET
      name = COALESCE(${body.name}, name),
      city = COALESCE(${body.city}, city),
      address = COALESCE(${body.address}, address),
      lat = COALESCE(${body.lat}, lat),
      lng = COALESCE(${body.lng}, lng),
      is_active = COALESCE(${body.isActive}, is_active)
    WHERE id = ${id}
  `

  return { success: true }
})
