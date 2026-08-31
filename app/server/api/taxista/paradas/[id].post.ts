export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  const stationId = getRouterParam(event, 'id')

  const { error } = await writeTable('driver_stations').upsert({
    driver_id: user.id,
    station_id: stationId,
    is_active: true,
  })

  if (error) {
    throw createError({ statusCode: 500, message: error.message })
  }

  return { success: true }
})
