export default defineEventHandler(async (event) => {
  requireRole(event, 'admin')
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'Missing id' })
  const body = await readBody(event)
  const db = useDb()

  const updateData: Record<string, any> = {}
  if (body.isMember !== undefined) updateData.is_member = body.isMember
  if (body.isExempt !== undefined) updateData.is_exempt = body.isExempt
  if (body.isActive !== undefined) updateData.is_active = body.isActive

  if (Object.keys(updateData).length > 0) {
    const { error } = await db
      .from('drivers')
      .update(updateData as any)
      .eq('id', id)

    if (error) {
      throw createError({ statusCode: 500, message: error.message })
    }
  }

  return { success: true }
})
