export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  const id = getRouterParam(event, 'id')

  const { data: vehicles, error } = await callRpc<Array<Record<string, unknown>>>('get_vehicle_with_accessories', {
    p_id: id,
    p_driver_id: user.id,
  })

  if (error || !vehicles || (vehicles as Array<Record<string, unknown>>).length === 0) {
    throw createError({ statusCode: 404, message: 'Vehicle not found' })
  }

  return vehicles[0]
})
