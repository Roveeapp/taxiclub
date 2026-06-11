export default defineEventHandler(async (event) => {
  requireRole(event, 'admin')
  const db = useDb()

  const { data: payouts, error } = await db.rpc('get_admin_payouts')

  if (error) {
    throw createError({ statusCode: 500, message: error.message })
  }

  return payouts || []
})
