export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'Missing id' })
  const db = useDb()

  const { data: offer, error } = await db
    .from('return_offers')
    .select('*')
    .eq('id', id)
    .eq('driver_id', user.id)
    .single()

  if (error || !offer) {
    throw createError({ statusCode: 404, message: 'Oferta no encontrada' })
  }

  return offer
})
