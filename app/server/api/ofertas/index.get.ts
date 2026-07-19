export default defineEventHandler(async () => {
  const db = useDb()

  // Expira al vuelo las ofertas cuya ventana ya pasó
  await expireStaleOffers()

  const { data, error } = await db
    .from('return_offers')
    .select(`
      id,
      origin_address,
      available_from,
      available_until,
      max_passengers,
      discount_pct,
      base_price,
      final_price,
      stations!destination_station_id ( name )
    `)
    .eq('status', 'active')
    .gte('available_until', new Date().toISOString())
    .order('available_from', { ascending: true })

  if (error) {
    throw createError({ statusCode: 500, message: error.message })
  }

  return (data || []).map((o: any) => ({
    ...o,
    destination_station_name: o.stations?.name ?? '',
    stations: undefined,
  }))
})
