export default defineEventHandler(async (event) => {
  const user = requireAuth(event)

  await expireStaleOffers()

  const { data: offers, error } = await callRpc<Array<Record<string, unknown>>>('get_driver_offers', {
    p_driver_id: user.id,
  })

  if (error) {
    throw createError({ statusCode: 500, message: error.message })
  }

  return offers || []
})
