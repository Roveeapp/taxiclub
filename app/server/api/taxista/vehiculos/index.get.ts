export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  const db = useDb()

  const { data: vehicles, error } = await db.rpc('get_vehicles_with_accessories', {
    p_driver_id: user.id,
  })

  if (error) {
    throw createError({ statusCode: 500, message: error.message })
  }

  return vehicles || []
})
