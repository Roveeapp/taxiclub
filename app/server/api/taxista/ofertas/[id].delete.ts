export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'Missing id' })

  const { error } = await writeTable('return_offers')
    .update({ status: 'cancelled' })
    .eq('id', id)
    .eq('driver_id', user.id)

  if (error) {
    throw createError({ statusCode: 500, message: error.message })
  }

  return { success: true }
})
