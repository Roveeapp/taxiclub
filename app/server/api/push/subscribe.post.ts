export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  const body = await readValidated(event, suscripcionPushSchema)

  const { error } = await writeTable('users')
    .update({ push_subscription: body.subscription })
    .eq('id', user.id)

  if (error) {
    throw createError({ statusCode: 500, message: error.message })
  }

  return { success: true }
})
