/**
 * El taxista fija su tarifa €/km (null o vacío = volver a la global).
 */
export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  const body = await readBody(event)
  const db = useDb()

  let perKm: number | null = null
  if (body?.pricePerKm !== null && body?.pricePerKm !== undefined && body?.pricePerKm !== '') {
    perKm = Number(body.pricePerKm)
    if (Number.isNaN(perKm) || perKm <= 0 || perKm > 100) {
      throw createError({ statusCode: 400, message: 'Tarifa no válida (entre 0,01 y 100 €/km)' })
    }
    perKm = Math.round(perKm * 100) / 100
  }

  const { error } = await (db.from('drivers') as any)
    .update({ custom_price_per_km: perKm })
    .eq('id', user.id)

  if (error) throw createError({ statusCode: 500, message: error.message })
  return { success: true, pricePerKm: perKm }
})
