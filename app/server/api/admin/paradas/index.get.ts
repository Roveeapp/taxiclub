export default defineEventHandler(async (event) => {
  requireRole(event, 'admin')
  const db = useDb()

  const { data: stations, error } = await db.rpc('get_admin_stations')

  if (error) {
    throw createError({ statusCode: 500, message: error.message })
  }

  // Exclusividades (tabla solo accesible con service role)
  let exclusivities: Array<{ station_id: string, driver_id: string }> = []
  try {
    const { data } = await db.from('station_exclusivities').select('station_id, driver_id')
    exclusivities = (data || [])
  } catch (e) {
    // station_exclusivities existe desde la migración 024, así que este catch
    // ya no cubre una tabla ausente: solo oculta un fallo real.
    console.error('[Paradas] No se pudieron leer las exclusividades:', (e as Error)?.message)
  }

  const exclusivityMap = new Map(exclusivities.map(e => [e.station_id, e.driver_id]))

  return ((stations || [])).map(s => ({
    ...s,
    exclusive_driver_id: exclusivityMap.get(s.id) || null,
  }))
})
