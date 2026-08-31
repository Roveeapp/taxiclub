export default defineEventHandler(async (event) => {
  const body = await readValidated(event, recuperarPasswordSchema)

  if (!body.email || !body.password) {
    throw createError({ statusCode: 400, message: 'Email and password required' })
  }

  const supabase = useDb()
  const { data, error } = await supabase.auth.admin.generateLink({
    type: 'magiclink',
    email: body.email,
  })

  if (error) {
    throw createError({ statusCode: 400, message: error.message })
  }

  return { success: true }
})
