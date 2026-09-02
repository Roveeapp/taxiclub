export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  const db = useDb()

  const { data: userData, error } = await db
    .from('users')
    .select('id, email, phone, full_name, role, created_at')
    .eq('id', user.id)
    .single()

  if (error || !userData) {
    throw createError({ statusCode: 404, message: 'User not found' })
  }

  let driverData = null
  if (userData.role === 'driver') {
    // Columnas explícitas, no `*`: esta respuesta va al navegador y la tabla
    // `drivers` guarda cosas que no tienen por qué salir de aquí.
    //
    //   stripe_account_id      la cuenta de Stripe Connect del taxista
    //   last_assigned_at       el cursor del reparto por turnos; publicarlo
    //                          dice a cada uno su posición exacta en la cola
    //   custom_commission_pct  las condiciones comerciales que el club le
    //   custom_monthly_fee     aplica a ese taxista en concreto
    //   is_exempt
    //
    // Con `*`, además, cualquier columna que se añada mañana empieza a viajar
    // al navegador sola, sin que nadie lo decida. Esto es lo que el panel usa;
    // si hiciera falta enseñarle sus condiciones al taxista —que es defendible—
    // es una decisión de producto y se añade a mano.
    const { data: driver } = await db
      .from('drivers')
      .select('is_member, is_approved, member_since, custom_price_per_km, license_number, license_city')
      .eq('id', user.id)
      .single()
    driverData = driver || null
  }

  return { ...userData, driver: driverData }
})
