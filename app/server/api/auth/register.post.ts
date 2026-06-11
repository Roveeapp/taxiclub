export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  if (!body.email || !body.password) {
    throw createError({ statusCode: 400, message: 'Email and password required' })
  }

  const supabase = useDb()
  const { data, error } = await supabase.auth.admin.createUser({
    email: body.email,
    password: body.password,
    email_confirm: true,
    user_metadata: {
      role: body.role || 'client',
      full_name: body.fullName || '',
    },
  })

  if (error) {
    throw createError({ statusCode: 400, message: error.message })
  }

  const db = useDb()

  const { error: userError } = await db.from('users').insert({
    id: data.user.id,
    email: body.email,
    full_name: body.fullName || null,
    role: body.role || 'client',
  })

  if (userError) {
    throw createError({ statusCode: 500, message: userError.message })
  }

  if (body.role === 'driver') {
    const { error: driverError } = await db.from('drivers').insert({
      id: data.user.id,
      license_number: body.licenseNumber || 'PENDING',
      license_city: body.licenseCity || 'PENDING',
    })

    if (driverError) {
      throw createError({ statusCode: 500, message: driverError.message })
    }
  }

  return { id: data.user.id, email: data.user.email }
})
