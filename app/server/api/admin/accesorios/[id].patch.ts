export default defineEventHandler(async (event) => {
  requireRole(event, 'admin')
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'Missing id' })
  const body = await readBody(event)
  const db = useDb()

  const updateData: Record<string, any> = {}
  if (body.name !== undefined) {
    const name = String(body.name).trim()
    if (!name) throw createError({ statusCode: 400, message: 'El nombre es obligatorio' })
    updateData.name = name
  }
  if (body.icon !== undefined) updateData.icon = String(body.icon).trim() || 'tabler:star'
  if (body.description !== undefined) updateData.description = String(body.description).trim() || null
  if (body.isActive !== undefined) updateData.is_active = !!body.isActive

  if (Object.keys(updateData).length === 0) return { success: true }

  const { error } = await (db.from('accessories') as any)
    .update(updateData)
    .eq('id', id)

  if (error) throw createError({ statusCode: 500, message: error.message })
  return { success: true }
})
