export default defineEventHandler(async (event) => {
  requireRole(event, 'admin')
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'Missing id' })
  const body = await readValidated(event, editarConductorSchema)
  const db = useDb()

  const updateData: Record<string, unknown> = {}
  if (body.isMember !== undefined) updateData.is_member = body.isMember
  if (body.isExempt !== undefined) updateData.is_exempt = body.isExempt
  if (body.isActive !== undefined) updateData.is_active = body.isActive
  if (body.isApproved !== undefined) updateData.is_approved = body.isApproved

  // Cuota mensual personalizada (null = volver a la cuota global)
  if (body.customMonthlyFee !== undefined) {
    const fee = body.customMonthlyFee ?? null
    if (fee !== null && (Number.isNaN(fee) || fee < 0)) {
      throw createError({ statusCode: 400, message: 'Cuota mensual no válida' })
    }
    updateData.custom_monthly_fee = fee
  }

  // Comisión personalizada en % (null = volver a la comisión global)
  if (body.customCommissionPct !== undefined) {
    const pct = body.customCommissionPct ?? null
    if (pct !== null && (Number.isNaN(pct) || pct < 0 || pct > 100)) {
      throw createError({ statusCode: 400, message: 'Comisión no válida (0–100)' })
    }
    updateData.custom_commission_pct = pct
  }

  if (Object.keys(updateData).length > 0) {
    const { error } = await writeTable('drivers')
      .update(updateData)
      .eq('id', id)

    if (error) {
      throw createError({ statusCode: 500, message: error.message })
    }
  }

  // Credenciales (Supabase Auth, requiere service role)
  const newEmail = typeof body.email === 'string' ? body.email.trim() : ''
  const newPassword = typeof body.password === 'string' ? body.password : ''

  if (newEmail || newPassword) {
    const authUpdate: { email?: string, password?: string, email_confirm?: boolean } = {}

    if (newEmail) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
        throw createError({ statusCode: 400, message: 'Email no válido' })
      }
      authUpdate.email = newEmail
      authUpdate.email_confirm = true // el admin lo cambia directamente, sin email de confirmación
    }

    if (newPassword) {
      if (newPassword.length < 6) {
        throw createError({ statusCode: 400, message: 'La contraseña debe tener al menos 6 caracteres' })
      }
      authUpdate.password = newPassword
    }

    const { error: authError } = await db.auth.admin.updateUserById(id, authUpdate)
    if (authError) {
      const msg = authError.message?.includes('already been registered')
        ? 'Ya existe otra cuenta con ese email'
        : authError.message
      throw createError({ statusCode: 400, message: msg || 'No se pudieron actualizar las credenciales' })
    }

    // Mantener sincronizada la tabla users
    if (newEmail) {
      const { error: userError } = await writeTable('users')
        .update({ email: newEmail })
        .eq('id', id)
      if (userError) {
        console.error('[Admin] Auth actualizado pero users.email falló:', userError.message)
      }
    }
  }

  return { success: true }
})
