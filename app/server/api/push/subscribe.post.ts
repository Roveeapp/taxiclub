export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  const body = await readBody(event)
  const db = useDb()

  const { error } = await db
    .from('users')
    .update({ push_subscription: body.subscription } as any)
    .eq('id', user.id)

  if (error) {
    throw createError({ statusCode: 500, message: error.message })
  }

  return { success: true }
})
