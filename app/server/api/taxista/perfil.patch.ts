export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  const body = await readBody(event)
  const db = useDb()

  const fullName = String(body?.fullName || '').trim()
  const phone = String(body?.phone || '').trim()
  const licenseNumber = String(body?.licenseNumber || '').trim()
  const licenseCity = String(body?.licenseCity || '').trim()

  if (!fullName) {
    throw createError({ statusCode: 400, message: 'El nombre es obligatorio' })
  }
  if (!phone) {
    throw createError({ statusCode: 400, message: 'El teléfono es obligatorio' })
  }
  if (!licenseNumber) {
    throw createError({ statusCode: 400, message: 'El número de licencia es obligatorio' })
  }
  if (!licenseCity) {
    throw createError({ statusCode: 400, message: 'La ciudad de la licencia es obligatoria' })
  }

  // 1. Actualizar users (full_name, phone)
  const { error: userError } = await db
    .from('users')
    .update({
      full_name: fullName,
      phone: phone,
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id)

  if (userError) {
    throw createError({ statusCode: 500, message: userError.message })
  }

  // 2. Actualizar drivers (license_number, license_city)
  const { error: driverError } = await db
    .from('drivers')
    .update({
      license_number: licenseNumber,
      license_city: licenseCity,
    })
    .eq('id', user.id)

  if (driverError) {
    throw createError({ statusCode: 500, message: driverError.message })
  }

  // Actualizar también la metadata del usuario de auth de Supabase (opcional pero recomendado)
  const client = useDb()
  await client.auth.admin.updateUserById(user.id, {
    user_metadata: { full_name: fullName }
  })

  return { success: true }
})
