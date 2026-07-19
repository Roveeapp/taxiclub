export default defineEventHandler(async (event) => {
  requireAuth(event)
  const db = useDb()

  const { data, error } = await db
    .from('stations')
    .select('id, name, city, lat, lng')
    .eq('is_active', true)
    .order('city')
    .order('name')

  if (error) throw createError({ statusCode: 500, message: error.message })
  return data || []
})
