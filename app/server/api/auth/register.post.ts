export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  if (!body.email || !body.password) {
    throw createError({ statusCode: 400, message: 'Email and password required' })
  }

  const supabase = useSupabaseAdmin()
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

  const sql = useSql()

  await sql`
    INSERT INTO users (id, email, full_name, role)
    VALUES (${data.user.id}, ${body.email}, ${body.fullName || null}, ${body.role || 'client'})
  `

  if (body.role === 'driver') {
    await sql`
      INSERT INTO drivers (id, license_number, license_city)
      VALUES (${data.user.id}, ${body.licenseNumber || 'PENDING'}, ${body.licenseCity || 'PENDING'})
    `
  }

  return { id: data.user.id, email: data.user.email }
})
