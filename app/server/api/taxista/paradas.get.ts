export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  const db = useDb()

  const { data: stations, error } = await (db.rpc as any)('get_driver_stations', {
    p_driver_id: user.id,
  })

  if (error) {
    throw createError({ statusCode: 500, message: error.message })
  }

  return stations || []
})
