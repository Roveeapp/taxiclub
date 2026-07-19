export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'Missing id' })
  const db = useDb()

  const { error } = await db
    .from('driver_fixed_routes')
    .delete()
    .eq('id', id)
    .eq('driver_id', user.id)

  if (error) throw createError({ statusCode: 500, message: error.message })
  return { success: true }
})
