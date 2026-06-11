export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  if (!body.email || !body.password) {
    throw createError({ statusCode: 400, message: 'Email and password required' })
  }

  const supabase = useSupabaseAdmin()
  const { data, error } = await supabase.auth.admin.generateLink({
    type: 'magiclink',
    email: body.email,
  })

  if (error) {
    throw createError({ statusCode: 400, message: error.message })
  }

  return { success: true }
})
