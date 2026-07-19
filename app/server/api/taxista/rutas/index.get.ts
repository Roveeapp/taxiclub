export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  const db = useDb()

  const { data, error } = await db
    .from('driver_fixed_routes')
    .select('*')
    .eq('driver_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    // Tabla aún sin crear (migración 031)
    if (error.message?.includes('does not exist')) return []
    throw createError({ statusCode: 500, message: error.message })
  }
  return data || []
})
