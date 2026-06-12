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
  if ((userData as any).role === 'driver') {
    const { data: driver } = await db
      .from('drivers')
      .select('*')
      .eq('id', user.id)
      .single()
    driverData = driver || null
  }

  return { ...(userData as any), driver: driverData }
})
