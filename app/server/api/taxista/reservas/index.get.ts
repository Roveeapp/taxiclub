export default defineEventHandler(async (event) => {
  const user = requireAuth(event)

  const { data: assignments, error } = await callRpc<Array<Record<string, unknown>>>('get_driver_reservations', {
    p_driver_id: user.id,
  })

  if (error) {
    throw createError({ statusCode: 500, message: error.message })
  }

  return assignments || []
})
