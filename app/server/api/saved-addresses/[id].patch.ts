export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'Missing id' })
  const body = await readBody(event)
  const db = useDb()

  const updateData: Record<string, any> = {}
  if (body.label !== undefined) updateData.label = body.label
  if (body.is_favorite !== undefined) updateData.is_favorite = body.is_favorite

  const { error } = await (db
    .from('saved_addresses') as any)
    .update(updateData)
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    throw createError({ statusCode: 500, message: error.message })
  }

  return { success: true }
})
