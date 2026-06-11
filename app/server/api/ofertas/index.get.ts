export default defineEventHandler(async () => {
  const db = useDb()

  const { data: offers, error } = await db.rpc('get_active_offers')

  if (error) {
    throw createError({ statusCode: 500, message: error.message })
  }

  return offers || []
})
