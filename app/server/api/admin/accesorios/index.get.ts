export default defineEventHandler(async (event) => {
  requireRole(event, 'admin')
  const db = useDb()

  const { data, error } = await db
    .from('accessories')
    .select('*')
    .order('name')

  if (error) throw createError({ statusCode: 500, message: error.message })
  return data || []
})
