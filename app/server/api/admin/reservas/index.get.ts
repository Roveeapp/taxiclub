export default defineEventHandler(async (event) => {
  requireRole(event, 'admin')
  const query = getQuery(event)

  const status = query.status as string | undefined
  const date = query.date as string | undefined

  const { data: bookings, error } = await callRpc<Array<Record<string, unknown>>>('get_admin_bookings', {
    p_status: status || null,
    p_date: date || null,
  })

  if (error) {
    throw createError({ statusCode: 500, message: error.message })
  }

  return bookings || []
})
