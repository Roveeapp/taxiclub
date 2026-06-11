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
  const { data: prices } = await db
    .rpc('get_route_price', {
      p_origin_id: originId,
      p_destination_id: destinationId,
    })

  if (prices && prices.length > 0 && prices[0].base_price !== null) {
    return Number(prices[0].base_price)
  }
  return 25
}
