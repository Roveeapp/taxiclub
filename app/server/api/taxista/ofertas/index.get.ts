export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  const db = useDb()

  await expireStaleOffers()

  const { data: offers, error } = await (db.rpc as any)('get_driver_offers', {
    p_driver_id: user.id,
  })

  if (error) {
    throw createError({ statusCode: 500, message: error.message })
  }

  return offers || []
})
