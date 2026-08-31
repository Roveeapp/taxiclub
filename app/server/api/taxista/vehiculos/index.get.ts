export default defineEventHandler(async (event) => {
  const user = requireAuth(event)

  const { data: vehicles, error } = await callRpc<Array<Record<string, unknown>>>('get_vehicles_with_accessories', {
    p_driver_id: user.id,
  })

  if (error) {
    throw createError({ statusCode: 500, message: error.message })
  }

  return vehicles || []
})
