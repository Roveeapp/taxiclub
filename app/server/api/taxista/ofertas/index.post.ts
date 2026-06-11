export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  const body = await readBody(event)
  const sql = useSql()

  const basePrice = 25
  const finalPrice = basePrice * (1 - (body.discountPct || 0) / 100)

  const [offer] = await sql`
    INSERT INTO return_offers (
      driver_id, origin_booking_id, origin_address,
      origin_lat, origin_lng, destination_station_id,
      available_from, available_until, max_passengers,
      discount_pct, base_price, final_price, status
    ) VALUES (
      ${user.id}, ${body.originBookingId || null}, ${body.originAddress},
      ${body.originLat || null}, ${body.originLng || null}, ${body.destinationStationId},
      ${body.availableFrom}, ${body.availableUntil}, ${body.maxPassengers || 4},
      ${body.discountPct || 0}, ${basePrice}, ${finalPrice}, 'active'
    )
    RETURNING *
  `

  return offer
})
