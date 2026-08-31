/**
 * Alta de conductor por el admin: crea el usuario de Auth (email
 * confirmado directamente), su fila en users y en drivers.
 */
export default defineEventHandler(async (event) => {
  requireRole(event, 'admin')
  const body = await readValidated(event, crearConductorSchema)
  const db = useDb()

  const email = String(body?.email || '').trim().toLowerCase()
  const password = String(body?.password || '')
  const fullName = String(body?.fullName || '').trim()
  const licenseNumber = String(body?.licenseNumber || '').trim()
  const licenseCity = String(body?.licenseCity || '').trim()

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw createError({ statusCode: 400, message: 'Email no válido' })
  }
  if (password.length < 6) {
    throw createError({ statusCode: 400, message: 'La contraseña debe tener al menos 6 caracteres' })
  }
  if (!fullName || !licenseNumber || !licenseCity) {
    throw createError({ statusCode: 400, message: 'Nombre, licencia y ciudad son obligatorios' })
  }

  // 1. Usuario de Auth (el trigger crea users/drivers a partir del metadata)
  const { data: created, error: authError } = await db.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      role: 'driver',
      full_name: fullName,
      phone: body?.phone || null,
    },
  })

  if (authError || !created?.user) {
    const msg = authError?.message?.includes('already been registered')
      ? 'Ya existe una cuenta con ese email'
      : authError?.message
    throw createError({ statusCode: 400, message: msg || 'No se pudo crear el usuario' })
  }
  const userId = created.user.id

  // 2. Asegurar filas en users y drivers (por si el trigger no cubre este flujo)
  await (db.from('users') as any).upsert({
    id: userId,
    email,
    full_name: fullName,
    phone: body?.phone || null,
    role: 'driver',
  }, { onConflict: 'id' })

  const { error: driverError } = await (db.from('drivers') as any).upsert({
    id: userId,
    license_number: licenseNumber,
    license_city: licenseCity,
    is_member: !!body?.isMember,
    member_since: body?.isMember ? new Date().toISOString().slice(0, 10) : null,
    is_active: true,
    is_approved: true, // lo da de alta el admin: aprobado
  }, { onConflict: 'id' })

  if (driverError) {
    // revertir el usuario de auth para no dejar cuentas huérfanas
    await db.auth.admin.deleteUser(userId).catch(() => {})
    const msg = driverError.message?.includes('duplicate')
      ? 'Ya existe un conductor con esa licencia'
      : driverError.message
    throw createError({ statusCode: 400, message: msg })
  }

  return { success: true, id: userId }
})
