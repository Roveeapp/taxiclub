export default defineEventHandler(async (event) => {
  requireRole(event, 'admin')
  const db = useDb()
  const query = getQuery(event)

  const status = query.status as string | undefined
  const date = query.date as string | undefined

  const { data: bookings, error } = await (db.rpc as any)('get_admin_bookings', {
    p_status: status || null,
    p_date: date || null,
  })

  if (error) {
    throw createError({ statusCode: 500, message: error.message })
  }

  return bookings || []
})
