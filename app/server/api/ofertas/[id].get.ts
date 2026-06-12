export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const db = useDb()

  const { data: offers, error } = await (db.rpc as any)('get_offer_by_id', {
    p_id: id,
  })

  if (error || !offers || offers.length === 0) {
    throw createError({ statusCode: 404, message: 'Offer not found' })
  }

  return offers[0]
})
