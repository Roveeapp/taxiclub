import { geocodeAddress } from '~/server/services/pricing'

export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  const body = await readBody(event)
  const db = useDb()

  const originLabel = String(body?.originLabel || '').trim()
  const destLabel = String(body?.destLabel || '').trim()
  const price = Number(body?.price)

  // IDs de parada opcionales (para matching rápido en el pricing)
  const originStationId = body?.originStationId || null
  const destStationId = body?.destStationId || null

  if (!originLabel) {
    throw createError({ statusCode: 400, message: 'Falta el origen' })
  }
  if (!destLabel) {
    throw createError({ statusCode: 400, message: 'Falta el destino' })
  }
  if (originLabel === destLabel) {
    throw createError({ statusCode: 400, message: 'Origen y destino deben ser distintos' })
  }
  if (!price || Number.isNaN(price) || price <= 0) {
    throw createError({ statusCode: 400, message: 'Indica un precio válido (> 0 €)' })
  }

  // Coordenadas: si viene de una parada usamos sus coords, si no geocodificamos
  let originLat: number | null = body?.originLat ? Number(body.originLat) : null
  let originLng: number | null = body?.originLng ? Number(body.originLng) : null
  let destLat: number | null = body?.destLat ? Number(body.destLat) : null
  let destLng: number | null = body?.destLng ? Number(body.destLng) : null

  // Geocodificar si no hay coordenadas
  if (!originLat || !originLng) {
    const geo = await geocodeAddress(originLabel)
    if (geo) { originLat = geo.lat; originLng = geo.lng }
  }
  if (!destLat || !destLng) {
    const geo = await geocodeAddress(destLabel)
    if (geo) { destLat = geo.lat; destLng = geo.lng }
  }

  const { data, error } = await (db.from('driver_fixed_routes') as any)
    .insert({
      driver_id: user.id,
      origin_label: originLabel,
      origin_lat: originLat,
      origin_lng: originLng,
      origin_station_id: originStationId,
      dest_label: destLabel,
      dest_lat: destLat,
      dest_lng: destLng,
      dest_station_id: destStationId,
      price,
    })
    .select()
    .single()

  if (error) throw createError({ statusCode: 500, message: error.message })
  return data
})
