/**
 * Edición de una oferta de retorno por su taxista.
 * Solo ofertas propias en estado 'active' (una reservada o expirada
 * ya no se puede modificar).
 */
export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'Missing id' })
  const body = await readBody(event)
  const db = useDb()

  const { data: offer, error: findError } = await db
    .from('return_offers')
    .select('*')
    .eq('id', id)
    .eq('driver_id', user.id)
    .single()

  if (findError || !offer) {
    throw createError({ statusCode: 404, message: 'Oferta no encontrada' })
  }
  const o = offer as Record<string, any>

  if (o.status !== 'active') {
    throw createError({ statusCode: 400, message: 'Solo se pueden editar ofertas activas' })
  }

  const updateData: Record<string, any> = {}

  if (body.originAddress !== undefined) {
    if (!String(body.originAddress).trim()) {
      throw createError({ statusCode: 400, message: 'El origen es obligatorio' })
    }
    updateData.origin_address = String(body.originAddress).trim()
  }
  if (body.destinationStationId !== undefined) {
    updateData.destination_station_id = body.destinationStationId
  }
  if (body.availableFrom !== undefined) updateData.available_from = body.availableFrom
  if (body.availableUntil !== undefined) updateData.available_until = body.availableUntil
  if (body.maxPassengers !== undefined) {
    const mp = Number(body.maxPassengers)
    if (Number.isNaN(mp) || mp < 1 || mp > 8) {
      throw createError({ statusCode: 400, message: 'Plazas no válidas (1–8)' })
    }
    updateData.max_passengers = mp
  }

  // Validar ventana horaria resultante
  const from = new Date(updateData.available_from ?? o.available_from)
  const until = new Date(updateData.available_until ?? o.available_until)
  if (Number.isNaN(from.getTime()) || Number.isNaN(until.getTime()) || from >= until) {
    throw createError({ statusCode: 400, message: 'La ventana horaria no es válida (desde debe ser anterior a hasta)' })
  }
  if (until.getTime() < Date.now()) {
    throw createError({ statusCode: 400, message: 'La hora "hasta" ya ha pasado' })
  }

  // Descuento → recalcular precio final sobre el precio base de la oferta
  if (body.discountPct !== undefined) {
    const pct = Number(body.discountPct)
    if (Number.isNaN(pct) || pct < 0 || pct > 40) {
      throw createError({ statusCode: 400, message: 'Descuento no válido (0–40%)' })
    }
    updateData.discount_pct = pct
    updateData.final_price = Math.round(Number(o.base_price) * (1 - pct / 100) * 100) / 100
  }

  if (Object.keys(updateData).length === 0) {
    return o
  }

  const { data: updated, error: updateError } = await (db
    .from('return_offers') as any)
    .update(updateData)
    .eq('id', id)
    .eq('driver_id', user.id)
    .select()
    .single()

  if (updateError || !updated) {
    throw createError({ statusCode: 500, message: updateError?.message || 'No se pudo actualizar la oferta' })
  }

  return updated
})
