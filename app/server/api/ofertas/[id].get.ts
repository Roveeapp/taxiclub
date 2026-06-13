export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const db = useDb()

  const { data, error } = await db
    .from('return_offers')
    .select(`
      id, origin_address, available_from, available_until,
      max_passengers, discount_pct, base_price, final_price,
      stations!destination_station_id ( id, name, city )
    `)
    .eq('id', id!)
    .single()

  if (error || !data) {
    throw createError({ statusCode: 404, message: 'Offer not found' })
  }

  const offer = data as Record<string, any>
  return {
    ...offer,
    destination_station_name: offer.stations?.name ?? '',
    destination_station_city: offer.stations?.city ?? '',
    stations: undefined,
  }
})
