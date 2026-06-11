export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  const id = getRouterParam(event, 'id')
  const db = useDb()

  const { data: vehicles, error } = await db.rpc('get_vehicle_with_accessories', {
    p_id: id,
    p_driver_id: user.id,
  })

  if (error || !vehicles || vehicles.length === 0) {
    throw createError({ statusCode: 404, message: 'Vehicle not found' })
  }

  return vehicles[0]
})
