export default defineEventHandler(async (event) => {
  requireRole(event, 'admin')
  const body = await readBody(event)
  const db = useDb()

  const { data: station, error } = await db
    .from('stations')
    .insert({
      name: body.name,
      city: body.city,
      address: body.address || null,
      lat: body.lat || null,
      lng: body.lng || null,
    } as any)
    .select()
    .single()

  if (error) {
    throw createError({ statusCode: 500, message: error.message })
  }

  return station
})
