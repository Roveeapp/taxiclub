export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  const body = await readValidated(event, zonaSchema)
  const db = useDb()

  const stationId = String(body?.stationId || '')
  const fromKm = Number(body?.fromKm ?? 0)
  const toKm = Number(body?.toKm)
  const mode = body?.mode as 'exclude' | 'fixed_price'
  const fixedPrice = body?.fixedPrice !== undefined && body?.fixedPrice !== null && body?.fixedPrice !== ''
    ? Number(body.fixedPrice)
    : null

  if (!stationId) throw createError({ statusCode: 400, message: 'Falta la parada' })
  if (!['exclude', 'fixed_price'].includes(mode)) {
    throw createError({ statusCode: 400, message: 'Modo no válido' })
  }
  if (Number.isNaN(fromKm) || Number.isNaN(toKm) || fromKm < 0 || toKm <= fromKm || toKm > 500) {
    throw createError({ statusCode: 400, message: 'Rango de km no válido (desde < hasta, máx. 500 km)' })
  }
  if (mode === 'fixed_price' && (!fixedPrice || Number.isNaN(fixedPrice) || fixedPrice <= 0)) {
    throw createError({ statusCode: 400, message: 'Indica un precio fijo válido' })
  }

  // Sin solapes con los anillos existentes de esa parada
  const { data: existing } = await db
    .from('driver_station_zones')
    .select('radius_from_km, radius_to_km')
    .eq('driver_id', user.id)
    .eq('station_id', stationId)

  for (const z of (existing || []) as any[]) {
    const zFrom = Number(z.radius_from_km)
    const zTo = Number(z.radius_to_km)
    if (fromKm < zTo && toKm > zFrom) {
      throw createError({
        statusCode: 400,
        message: `Se solapa con el anillo ${zFrom}–${zTo} km existente`,
      })
    }
  }

  const { data, error } = await writeTable('driver_station_zones')
    .insert({
      driver_id: user.id,
      station_id: stationId,
      radius_from_km: fromKm,
      radius_to_km: toKm,
      mode,
      fixed_price: mode === 'fixed_price' ? fixedPrice : null,
    })
    .select()
    .single()

  if (error) throw createError({ statusCode: 500, message: error.message })
  return data
})
