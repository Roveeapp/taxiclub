export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  const db = useDb()

  const { data: zones, error } = await db
    .from('driver_station_zones')
    .select('*')
    .eq('driver_id', user.id)
    .order('station_id')
    .order('radius_from_km')

  if (error) {
    // Tabla aún sin crear (migración 028)
    if (error.message?.includes('does not exist')) return []
    throw createError({ statusCode: 500, message: error.message })
  }
  return zones || []
})
