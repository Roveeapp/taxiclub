export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  const stationId = getRouterParam(event, 'id')
  const db = useDb()

  if (!stationId) {
    throw createError({ statusCode: 400, message: 'Falta el identificador de la parada' })
  }

  const { error } = await db
    .from('driver_stations')
    .delete()
    .eq('driver_id', user.id)
    .eq('station_id', stationId)

  if (error) {
    throw createError({ statusCode: 500, message: error.message })
  }

  return { success: true }
})
