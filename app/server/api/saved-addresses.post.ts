export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  const body = await readBody(event)
  const db = useDb()

  const { data: address, error } = await db
    .from('saved_addresses')
    .insert({
      user_id: user.id,
      label: body.label,
      address: body.address,
      lat: body.lat || null,
      lng: body.lng || null,
      is_favorite: body.is_favorite || false,
    })
    .select('id, label, address, lat, lng, is_favorite')
    .single()

  if (error) {
    throw createError({ statusCode: 500, message: error.message })
  }

  return address
})
