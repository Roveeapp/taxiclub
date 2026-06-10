export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  const price = await calculateRoutePrice(
    body.originStationId,
    body.destinationStationId || body.destination,
  )

  let extras = 0
  if (body.needsChildSeat) extras += 5
  if (body.needsPetFriendly) extras += 3
  if (body.needsLargeVehicle) extras += 8

  return {
    basePrice: price,
    extras,
    totalPrice: price + extras,
  }
})

async function calculateRoutePrice(originId: string, destinationId: string): Promise<number> {
  const db = useDb()
  const prices = await db.execute`
    SELECT base_price FROM route_prices
    WHERE origin_station_id = ${originId}
      AND (destination_station_id = ${destinationId} OR destination_station_id IS NULL)
    LIMIT 1
  `
  if (prices.length > 0) {
    return Number(prices[0].base_price)
  }
  return 25
}
