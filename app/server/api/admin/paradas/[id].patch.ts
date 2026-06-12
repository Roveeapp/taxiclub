export default defineEventHandler(async (event) => {
  requireRole(event, 'admin')
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'Missing id' })
  const body = await readBody(event)
  const db = useDb()

  const updateData: Record<string, any> = {}
  if (body.name !== undefined) updateData.name = body.name
  if (body.city !== undefined) updateData.city = body.city
  if (body.address !== undefined) updateData.address = body.address
  if (body.lat !== undefined) updateData.lat = body.lat
  if (body.lng !== undefined) updateData.lng = body.lng
  if (body.isActive !== undefined) updateData.is_active = body.isActive

  const { error } = await (db
    .from('stations') as any)
    .update(updateData)
    .eq('id', id)

  if (error) {
    throw createError({ statusCode: 500, message: error.message })
  }

  return { success: true }
})
