export default defineEventHandler(async (event) => {
  requireRole(event, 'admin')
  const db = useDb()

  const { data: drivers, error } = await db.rpc('get_admin_drivers')

  if (error) {
    throw createError({ statusCode: 500, message: error.message })
  }

  return drivers || []
})
